'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ExternalLink, Loader2, PanelLeftClose, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration, formatKey } from '@/lib/setlist';
import type { LessonVideo, Setlist, SetlistSong } from '@/lib/types';

const LOOKUP_CONCURRENCY = 4;

// Lesson results survive the tray being hidden and shown again
const lessonCache = new Map<string, LessonVideo[]>();
const lessonErrors = new Map<string, string>();

const songKey = (song: SetlistSong) => `${song.artist}|${song.title}`;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Looks up lesson videos for each song, a few at a time
function useLessons(songs: SetlistSong[]) {
  const [, setVersion] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const queue = songs.filter((s) => !lessonCache.has(songKey(s)) && !lessonErrors.has(songKey(s)));

    const worker = async () => {
      while (queue.length > 0 && !cancelled) {
        const song = queue.shift()!;
        const key = songKey(song);
        try {
          const params = new URLSearchParams({ title: song.title, artist: song.artist });
          const res = await fetch(`/api/lessons?${params}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Lookup failed');
          lessonCache.set(key, data.videos);
        } catch (err) {
          lessonErrors.set(key, err instanceof Error ? err.message : 'Lookup failed');
        }
        if (!cancelled) setVersion((v) => v + 1);
      }
    };

    for (let i = 0; i < LOOKUP_CONCURRENCY; i++) worker();
    return () => {
      cancelled = true;
    };
  }, [songs, retryToken]);

  const retry = (song: SetlistSong) => {
    lessonErrors.delete(songKey(song));
    setRetryToken((t) => t + 1);
  };

  return {
    get: (song: SetlistSong) => ({
      videos: lessonCache.get(songKey(song)),
      error: lessonErrors.get(songKey(song)),
    }),
    retry,
  };
}

interface SetlistTrayProps {
  setlist: Setlist;
  currentVideoId: string | null;
  onPlay: (videoId: string, startSec?: number) => void;
  onChooseVideo: (songId: string, videoId: string | null) => void;
  onDelete: () => void;
  onHide: () => void;
  className?: string;
}

export default function SetlistTray({
  setlist,
  currentVideoId,
  onPlay,
  onChooseVideo,
  onDelete,
  onHide,
  className = '',
}: SetlistTrayProps) {
  const lessons = useLessons(setlist.songs);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const found = setlist.songs.filter((s) => lessons.get(s).videos !== undefined).length;

  return (
    <aside className={`bg-card rounded-lg border border-border flex flex-col min-h-0 ${className}`}>
      <div className="flex items-start gap-2 px-3 py-2 border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm truncate" title={setlist.name}>
            {setlist.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {setlist.songs.length} songs
            {found < setlist.songs.length && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                {found}/{setlist.songs.length}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className={confirmDelete ? 'text-destructive' : 'text-muted-foreground'}
          title={confirmDelete ? 'Click again to delete this setlist' : 'Delete setlist'}
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          onBlur={() => setConfirmDelete(false)}
        >
          <Trash2 />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Hide setlist" onClick={onHide}>
          <PanelLeftClose />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
        {setlist.songs.map((song, index) => {
          const { videos, error } = lessons.get(song);
          return (
            <SetlistRow
              key={song.id}
              index={index}
              song={song}
              videos={videos}
              error={error}
              currentVideoId={currentVideoId}
              onPlay={onPlay}
              onChooseVideo={onChooseVideo}
              onRetry={() => lessons.retry(song)}
            />
          );
        })}
      </div>

      <p className="px-3 py-2 border-t border-border text-[11px] leading-snug text-muted-foreground">
        Click a song to practice its lesson (⌘-click opens YouTube). Ranked to favor solos, then tabs, views and
        channel.
      </p>
    </aside>
  );
}

interface SetlistRowProps {
  index: number;
  song: SetlistSong;
  videos: LessonVideo[] | undefined;
  error: string | undefined;
  currentVideoId: string | null;
  onPlay: (videoId: string, startSec?: number) => void;
  onChooseVideo: (songId: string, videoId: string | null) => void;
  onRetry: () => void;
}

function SetlistRow({ index, song, videos, error, currentVideoId, onPlay, onChooseVideo, onRetry }: SetlistRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const best = videos?.[0];
  const chosen = (song.videoId && videos?.find((v) => v.videoId === song.videoId)) || best;
  const videoId = song.videoId || best?.videoId;
  const isCurrent = !!videoId && videoId === currentVideoId;
  const key = formatKey(song.key, song.mode);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${song.title} ${song.artist} guitar solo lesson`
  )}`;

  // Keep the song that's playing visible in the tray
  useEffect(() => {
    if (isCurrent) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isCurrent]);

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!videoId || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onPlay(videoId, chosen?.videoId === videoId ? chosen.startSec : undefined);
  };

  return (
    <div
      ref={rowRef}
      aria-current={isCurrent ? 'true' : undefined}
      className={`flex gap-2 pl-2 pr-1 py-2 border-l-2 ${
        isCurrent ? 'bg-primary/10 border-l-primary' : 'border-l-transparent hover:bg-accent/40'
      }`}
    >
      <span
        className={`w-5 text-right text-xs font-mono shrink-0 pt-0.5 ${
          isCurrent ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        {videoId ? (
          <a
            href={youtubeUrl(videoId)}
            onClick={handleTitleClick}
            className={`block text-sm font-medium leading-snug truncate hover:underline underline-offset-4 ${
              isCurrent ? 'text-primary' : 'hover:text-primary'
            }`}
            title={chosen ? `${chosen.title} — ${chosen.channelTitle}` : undefined}
          >
            {song.title}
          </a>
        ) : (
          <span className="block text-sm font-medium leading-snug truncate">{song.title}</span>
        )}

        <div className="text-xs text-muted-foreground truncate">
          {song.artist}
          {key && ` · ${key}`}
          {song.tempo && ` · ${song.tempo} bpm`}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0 mt-0.5">
          {chosen ? (
            <>
              {chosen.hasSolo && (
                <span className="px-1 rounded bg-amber-500/15 text-amber-400 font-semibold shrink-0">SOLO</span>
              )}
              {chosen.hasTabs && (
                <span className="px-1 rounded bg-primary/15 text-primary font-semibold shrink-0">TABS</span>
              )}
              <span className="truncate">{chosen.channelTitle}</span>
              <span className="shrink-0">· {compact.format(chosen.viewCount)}</span>
              {song.videoId && <span className="shrink-0 text-primary">· pick</span>}
            </>
          ) : error ? (
            <>
              <span className="text-destructive truncate">{error}</span>
              <button onClick={onRetry} className="underline shrink-0 hover:text-foreground">
                Retry
              </button>
            </>
          ) : videos ? (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="underline">
              No lesson found — search YouTube
            </a>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Finding the best lesson…
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center shrink-0">
        {videos && videos.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-6" title="Other lesson videos">
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-96 max-w-[calc(100vw-2rem)]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Lesson videos</DropdownMenuLabel>
              {videos.map((v, i) => (
                <DropdownMenuItem
                  key={v.videoId}
                  onSelect={() => onChooseVideo(song.id, i === 0 ? null : v.videoId)}
                  className="items-start"
                >
                  <Check className={v.videoId === videoId ? 'mt-0.5' : 'mt-0.5 invisible'} />
                  <div className="min-w-0">
                    <div className="text-sm leading-snug line-clamp-2">{v.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.hasSolo && <span className="text-amber-400 font-semibold">SOLO · </span>}
                      {v.hasTabs && <span className="text-primary font-semibold">TABS · </span>}
                      {v.channelTitle} · {compact.format(v.viewCount)} views · {formatDuration(v.durationSec * 1000)}
                      {v.startSec ? ` · skips intro → ${formatDuration(v.startSec * 1000)}` : ''}
                      {i === 0 && ' · best match'}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              {song.videoId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onChooseVideo(song.id, null)}>
                    <RotateCcw />
                    Reset to best match
                  </DropdownMenuItem>
                </>
              )}
              {videoId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href={youtubeUrl(videoId)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                      Open on YouTube
                    </a>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
