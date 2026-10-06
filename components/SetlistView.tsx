'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ExternalLink, Loader2, RotateCcw, Trash2 } from 'lucide-react';
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

// Lesson results survive navigating to a video and back
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

interface SetlistViewProps {
  setlist: Setlist;
  onPlay: (videoId: string, startSec?: number) => void;
  onChooseVideo: (songId: string, videoId: string | null) => void;
  onDelete: () => void;
}

export default function SetlistView({ setlist, onPlay, onChooseVideo, onDelete }: SetlistViewProps) {
  const lessons = useLessons(setlist.songs);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const found = setlist.songs.filter((s) => lessons.get(s).videos !== undefined).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight truncate">{setlist.name}</h2>
          <p className="text-sm text-muted-foreground">
            {setlist.songs.length} songs
            {found < setlist.songs.length && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Finding lessons {found}/{setlist.songs.length}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={confirmDelete ? 'text-destructive' : 'text-muted-foreground'}
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          onBlur={() => setConfirmDelete(false)}
        >
          <Trash2 />
          {confirmDelete ? 'Click again to delete' : 'Delete'}
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        {setlist.songs.map((song, index) => {
          const { videos, error } = lessons.get(song);
          return (
            <SetlistRow
              key={song.id}
              index={index}
              song={song}
              videos={videos}
              error={error}
              onPlay={onPlay}
              onChooseVideo={onChooseVideo}
              onRetry={() => lessons.retry(song)}
            />
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Click a song to practice its lesson in the looper (⌘-click to open on YouTube). Lessons are ranked to
        favor solos, then tabs, views and channel. Keys are detected by Spotify and can be off.
      </p>
    </div>
  );
}

interface SetlistRowProps {
  index: number;
  song: SetlistSong;
  videos: LessonVideo[] | undefined;
  error: string | undefined;
  onPlay: (videoId: string, startSec?: number) => void;
  onChooseVideo: (songId: string, videoId: string | null) => void;
  onRetry: () => void;
}

function SetlistRow({ index, song, videos, error, onPlay, onChooseVideo, onRetry }: SetlistRowProps) {
  const best = videos?.[0];
  const chosen = (song.videoId && videos?.find((v) => v.videoId === song.videoId)) || best;
  const videoId = song.videoId || best?.videoId;
  const key = formatKey(song.key, song.mode);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${song.title} ${song.artist} guitar lesson`
  )}`;

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!videoId || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onPlay(videoId, chosen?.videoId === videoId ? chosen.startSec : undefined);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-6 text-right text-sm text-muted-foreground font-mono shrink-0">{index + 1}</span>

      {videoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          className="hidden sm:block w-20 h-[45px] rounded object-cover bg-secondary shrink-0"
        />
      ) : (
        <div className="hidden sm:block w-20 h-[45px] rounded bg-secondary shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          {videoId ? (
            <a
              href={youtubeUrl(videoId)}
              onClick={handleTitleClick}
              className="font-medium truncate hover:text-primary hover:underline underline-offset-4"
              title={chosen ? `${chosen.title} — ${chosen.channelTitle}` : undefined}
            >
              {song.title}
            </a>
          ) : (
            <span className="font-medium truncate">{song.title}</span>
          )}
          <span className="text-sm text-muted-foreground truncate shrink-[2]">{song.artist}</span>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0 mt-0.5">
          {chosen ? (
            <>
              {chosen.hasSolo && (
                <span className="px-1 rounded bg-amber-500/15 text-amber-400 font-semibold shrink-0">SOLO</span>
              )}
              {chosen.hasTabs && (
                <span className="px-1 rounded bg-primary/15 text-primary font-semibold shrink-0">TABS</span>
              )}
              <span className="truncate">{chosen.channelTitle}</span>
              <span className="shrink-0">· {compact.format(chosen.viewCount)} views</span>
              <span className="shrink-0 hidden sm:inline">· {formatDuration(chosen.durationSec * 1000)}</span>
              {chosen.startSec && (
                <span className="shrink-0 hidden sm:inline">
                  · skips intro → {formatDuration(chosen.startSec * 1000)}
                </span>
              )}
              {song.videoId && <span className="shrink-0 text-primary">· your pick</span>}
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

      <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground font-mono w-16 shrink-0">
        {key && <span>{key}</span>}
        {song.tempo && <span>{song.tempo} bpm</span>}
      </div>

      <div className="flex items-center shrink-0">
        {videoId && (
          <Button variant="ghost" size="icon-sm" asChild title="Open on YouTube">
            <a href={youtubeUrl(videoId)} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
            </a>
          </Button>
        )}
        {videos && videos.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Other lesson videos">
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
