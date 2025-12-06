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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Preset } from '@/lib/types';

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
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const currentPresetIndex = useRef(0);

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

  const handleLoadVideo = () => {
    const videoId = extractVideoId(url);
    if (videoId) {
      setVideoId(videoId);
    }
  };

  const handleSavePreset = async (preset: Omit<Preset, 'id'>) => {
    if (!state.videoId) return;

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
        onSavePreset={() => setSaveDialogOpen(true)}
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
          </div>
        </div>
      </header>

      <main className={state.videoId ? "px-4 py-4" : "max-w-7xl mx-auto px-4 py-6"}>
        {/* Keyboard shortcuts help */}
        {showHelp && (
          <div className="mb-4 p-4 bg-card rounded-lg border border-border max-w-3xl">
            <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
            <KeyboardShortcutsHelp />
          </div>
        )}

        {/* Main content */}
        {state.videoId ? (
          <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-140px)]">
            {/* Video player - takes maximum available space */}
            <div className="flex-1 min-w-0 min-h-[300px] xl:min-h-0">
              <YouTubePlayer videoId={state.videoId} />
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
                  onSave={handleSavePreset}
                  onDelete={handleDeletePreset}
                  dialogOpen={saveDialogOpen}
                  onDialogOpenChange={setSaveDialogOpen}
                />
              </div>
            </div>
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
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-primary">⟳</span>
                <span>Loop any section</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">⚡</span>
                <span>25% - 200% speed</span>
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
