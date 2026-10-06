'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerProvider, usePlayer } from '@/lib/store';
import { extractVideoId, SPEED_STEP } from '@/lib/youtube';
import { useMidiBridge, MidiStatus } from '@/lib/midi-client';
import YouTubePlayer from '@/components/YouTubePlayer';
import Timeline from '@/components/Timeline';
import LoopControls from '@/components/LoopControls';
import SpeedControl from '@/components/SpeedControl';
import PlaybackControls from '@/components/PlaybackControls';
import PresetManager from '@/components/PresetManager';
import KeyboardShortcuts, { KeyboardShortcutsHelp } from '@/components/KeyboardShortcuts';
import UserMenu from '@/components/UserMenu';
import SetlistMenu from '@/components/SetlistMenu';
import SetlistTray from '@/components/SetlistTray';
import RecentTray from '@/components/RecentTray';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseExportifyCsv } from '@/lib/setlist';
import { ListMusic, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
import type { Preset, RecentVideo, Setlist, SetlistSummary } from '@/lib/types';

// Same width as the controls sidebar on the right
const TRAY_CLASSES = 'lg:w-80 shrink-0 max-h-80 lg:max-h-none lg:h-[calc(100vh-140px)]';

function VideoLooper() {
  const {
    state,
    setVideoId,
    togglePlayPause,
    toggleLoop,
    adjustSpeed,
    setSpeed,
    loadPreset,
  } = usePlayer();

  const [url, setUrl] = useState('');
  const [startSeconds, setStartSeconds] = useState(0);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const currentPresetIndex = useRef(0);
  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
  const [activeSetlist, setActiveSetlist] = useState<Setlist | null>(null);
  const [setlistError, setSetlistError] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  // The tray shows either the active setlist or the built-in "Recent" setlist
  const [trayView, setTrayView] = useState<'setlist' | 'recent'>('setlist');
  const [recent, setRecent] = useState<RecentVideo[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const openSetlist = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/setlists?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveSetlist(data.setlist);
      setSetlistError(null);
    } catch (err) {
      console.error('Error opening setlist:', err);
      setSetlistError('Could not open that setlist.');
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      const data = await fetch('/api/videos/history').then((res) => res.json());
      setRecent(data.history || []);
    } catch (err) {
      console.error('Error loading recent videos:', err);
    }
  }, []);

  // Load saved setlists and open the most recent one (or Recent if there are none)
  useEffect(() => {
    refreshRecent();
    fetch('/api/setlists')
      .then((res) => res.json())
      .then((data) => {
        const list: SetlistSummary[] = data.setlists || [];
        setSetlists(list);
        if (list.length > 0) openSetlist(list[0].id);
        else setTrayView('recent');
      })
      .catch(console.error);
  }, [openSetlist, refreshRecent]);

  // Load presets when video changes
  useEffect(() => {
    if (state.videoId) {
      fetch(`/api/presets?videoId=${state.videoId}`)
        .then((res) => res.json())
        .then((data) => {
          setPresets(data.presets || []);
          currentPresetIndex.current = 0;
        })
        .catch(console.error);
    }
  }, [state.videoId]);

  // MIDI handlers
  const midiHandlers = {
    onPlayPause: togglePlayPause,
    onToggleLoop: toggleLoop,
    onNextPreset: useCallback(() => {
      if (presets.length > 0) {
        currentPresetIndex.current = (currentPresetIndex.current + 1) % presets.length;
        loadPreset(presets[currentPresetIndex.current]);
      }
    }, [presets, loadPreset]),
    onPrevPreset: useCallback(() => {
      if (presets.length > 0) {
        currentPresetIndex.current =
          (currentPresetIndex.current - 1 + presets.length) % presets.length;
        loadPreset(presets[currentPresetIndex.current]);
      }
    }, [presets, loadPreset]),
    onSpeedDown: useCallback(() => adjustSpeed(-SPEED_STEP), [adjustSpeed]),
    onSpeedUp: useCallback(() => adjustSpeed(SPEED_STEP), [adjustSpeed]),
    onSetSpeed: setSpeed,
  };

  const { isConnected: midiConnected } = useMidiBridge(midiHandlers);

  const hasTray = trayView === 'recent' || activeSetlist !== null;

  const handleLoadVideo = () => {
    const videoId = extractVideoId(url);
    if (videoId) {
      setStartSeconds(0);
      setVideoId(videoId);
    }
  };

  const handlePlayRecent = (videoId: string) => {
    setStartSeconds(0);
    setVideoId(videoId);
    setUrl('');
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Allow re-importing the same file
    if (!file) return;

    try {
      const songs = parseExportifyCsv(await file.text());
      if (songs.length === 0) throw new Error('No songs found in that CSV.');

      const res = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ').trim(),
          songs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save setlist.');

      const setlist: Setlist = data.setlist;
      setActiveSetlist(setlist);
      setSetlists((prev) => [
        { id: setlist.id, name: setlist.name, songCount: setlist.songs.length, updatedAt: setlist.updatedAt },
        ...prev,
      ]);
      setSetlistError(null);
      setTrayView('setlist');
      setTrayOpen(true);
    } catch (err) {
      setSetlistError(err instanceof Error ? err.message : 'Could not import that CSV.');
    }
  };

  const handleChooseLessonVideo = async (songId: string, videoId: string | null) => {
    if (!activeSetlist) return;

    // Optimistic update
    setActiveSetlist({
      ...activeSetlist,
      songs: activeSetlist.songs.map((s) =>
        s.id === songId ? { ...s, videoId: videoId ?? undefined } : s
      ),
    });

    try {
      await fetch('/api/setlists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSetlist.id, songId, videoId }),
      });
    } catch (err) {
      console.error('Error saving lesson choice:', err);
    }
  };

  const handleDeleteSetlist = async () => {
    if (!activeSetlist) return;
    const id = activeSetlist.id;
    setActiveSetlist(null);
    setTrayView('recent');
    setSetlists((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/setlists?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting setlist:', err);
    }
  };

  const handlePlayFromSetlist = (videoId: string, startSec?: number) => {
    setStartSeconds(startSec ?? 0);
    setVideoId(videoId);
    setUrl('');
  };

  // id is a setlist ID, or "recent" for the built-in Recent setlist
  const handleOpenSetlist = (id: string) => {
    setTrayOpen(true);
    if (id === 'recent') {
      setTrayView('recent');
      return;
    }
    setTrayView('setlist');
    openSetlist(id);
  };

  const handleVideoTitleLoaded = async (title: string) => {
    if (!state.videoId || !title) return;
    
    try {
      await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: state.videoId,
          data: {
            title,
            url: `https://youtube.com/watch?v=${state.videoId}`,
            presets: [],
          },
        }),
      });
      refreshRecent();
    } catch (err) {
      console.error('Error saving video title:', err);
    }
  };

  // Save the current loop immediately with a default name ("Loop 1", "Loop 2", ...)
  const handleSaveCurrentLoop = async () => {
    if (!state.videoId || state.loop.start === null || state.loop.end === null) return;

    const names = new Set(presets.map((p) => p.name));
    let n = presets.length + 1;
    while (names.has(`Loop ${n}`)) n++;

    const preset: Omit<Preset, 'id'> = {
      name: `Loop ${n}`,
      start: state.loop.start,
      end: state.loop.end,
      speed: state.speed,
    };

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: state.videoId,
          preset,
        }),
      });
      const data = await res.json();
      if (data.preset) {
        setPresets((prev) => [...prev, data.preset]);
      }
    } catch (err) {
      console.error('Error saving preset:', err);
    }
  };

  const handleRenamePreset = async (presetId: string, name: string) => {
    if (!state.videoId) return;

    setPresets((prev) => prev.map((p) => (p.id === presetId ? { ...p, name } : p)));
    try {
      await fetch('/api/presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: state.videoId, presetId, name }),
      });
    } catch (err) {
      console.error('Error renaming preset:', err);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!state.videoId) return;

    try {
      await fetch(`/api/presets?videoId=${state.videoId}&presetId=${presetId}`, {
        method: 'DELETE',
      });
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Keyboard shortcuts handler */}
      <KeyboardShortcuts
        presets={presets}
        onSavePreset={handleSaveCurrentLoop}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-2 flex items-center gap-4">
          {/* Left: Title */}
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-primary">YouTube</span> Looper
            </h1>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded hidden sm:inline">
              Guitar Practice
            </span>
          </div>

          {/* Center: URL input */}
          <div className="flex-1 flex items-center justify-center gap-2 max-w-2xl mx-auto">
            {hasTray && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTrayOpen(!trayOpen)}
                className="h-8 px-2 shrink-0 text-muted-foreground hover:text-foreground"
                title={trayOpen ? 'Hide setlist' : 'Show setlist'}
              >
                {trayOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
            )}
            <Input
              type="text"
              placeholder="Paste YouTube URL or video ID..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
              className="flex-1 h-8 text-sm"
            />
            <Button onClick={handleLoadVideo} size="sm" className="h-8 px-4 shrink-0">
              Load
            </Button>
            <SetlistMenu
              setlists={setlists}
              activeId={trayView === 'recent' ? 'recent' : activeSetlist?.id ?? null}
              recentCount={recent.length}
              onOpen={handleOpenSetlist}
              onImport={() => csvInputRef.current?.click()}
            />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </div>

          {/* Right: Status and shortcuts */}
          <div className="flex items-center gap-3 shrink-0">
            <MidiStatus isConnected={midiConnected} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="hidden sm:inline-flex"
            >
              {showHelp ? 'Hide' : '?'}
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className={state.videoId || hasTray ? "px-4 py-4" : "max-w-7xl mx-auto px-4 py-6"}>
        {/* Keyboard shortcuts help */}
        {showHelp && (
          <div className="mb-4 p-4 bg-card rounded-lg border border-border max-w-3xl">
            <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
            <KeyboardShortcutsHelp />
          </div>
        )}

        {setlistError && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/50 text-sm text-destructive max-w-3xl mx-auto">
            {setlistError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Setlist tray */}
          {trayOpen && trayView === 'recent' && (
            <RecentTray
              videos={recent}
              currentVideoId={state.videoId}
              onPlay={handlePlayRecent}
              onHide={() => setTrayOpen(false)}
              className={TRAY_CLASSES}
            />
          )}
          {trayOpen && trayView === 'setlist' && activeSetlist && (
            <SetlistTray
              key={activeSetlist.id}
              setlist={activeSetlist}
              currentVideoId={state.videoId}
              onPlay={handlePlayFromSetlist}
              onChooseVideo={handleChooseLessonVideo}
              onDelete={handleDeleteSetlist}
              onHide={() => setTrayOpen(false)}
              className={TRAY_CLASSES}
            />
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {state.videoId ? (
              <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-140px)]">
                {/* Video player - takes maximum available space */}
                <div className="flex-1 min-w-0 min-h-[300px] xl:min-h-0">
                  <YouTubePlayer 
                    videoId={state.videoId} 
                    startSeconds={startSeconds}
                    onTitleLoaded={handleVideoTitleLoaded}
                  />
                </div>

                {/* All controls sidebar - fixed width on large screens */}
                <div className="xl:w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
                  {/* Timeline */}
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Timeline
                    </h3>
                    <Timeline />
                  </div>

                  {/* Playback controls */}
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Playback
                    </h3>
                    <PlaybackControls />
                  </div>

                  {/* Speed control */}
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Speed
                    </h3>
                    <SpeedControl />
                  </div>

                  {/* Loop controls */}
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Loop
                    </h3>
                    <LoopControls />
                  </div>

                  {/* Presets */}
                  <div className="bg-card p-3 rounded-lg border border-border flex-1 min-h-0 overflow-y-auto">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Presets
                    </h3>
                    <PresetManager
                      presets={presets}
                      onSaveCurrentLoop={handleSaveCurrentLoop}
                      onRename={handleRenamePreset}
                      onDelete={handleDeletePreset}
                    />
                  </div>
                </div>
              </div>
            ) : trayView === 'setlist' && activeSetlist ? (
              /* Setlist open, no song picked yet */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 mb-5 rounded-full bg-secondary flex items-center justify-center">
                  <ListMusic className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">{activeSetlist.name}</h2>
                <p className="text-muted-foreground max-w-md mb-5">
                  Pick a song from the setlist to start practicing its solo lesson.
                </p>
                {!trayOpen && (
                  <Button variant="secondary" onClick={() => setTrayOpen(true)}>
                    <PanelLeftOpen />
                    Show setlist
                  </Button>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 mb-6 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-4xl">🎸</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to Practice</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Paste a YouTube URL above to get started. You can loop sections,
                  adjust playback speed, and save presets for your favorite practice
                  spots.
                </p>
                <Button variant="secondary" onClick={() => csvInputRef.current?.click()} className="mb-8">
                  <Upload />
                  Upload CSV setlist
                </Button>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">⟳</span>
                    <span>Loop any section</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">⚡</span>
                    <span>40% - 110% speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">⌨️</span>
                    <span>Keyboard shortcuts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">🎹</span>
                    <span>MIDI control</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Press <kbd>?</kbd> for keyboard shortcuts • Connect your Helix Floor
          via MIDI bridge for hands-free control
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <PlayerProvider>
      <VideoLooper />
    </PlayerProvider>
  );
}
