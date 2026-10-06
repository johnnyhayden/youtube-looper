'use client';

import { useEffect, useRef } from 'react';
import { PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentVideo } from '@/lib/types';

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface RecentTrayProps {
  videos: RecentVideo[];
  currentVideoId: string | null;
  onPlay: (videoId: string) => void;
  onHide: () => void;
  className?: string;
}

// The "Recent" setlist: the last videos you've played, newest first
export default function RecentTray({ videos, currentVideoId, onPlay, onHide, className = '' }: RecentTrayProps) {
  return (
    <aside className={`bg-card rounded-lg border border-border flex flex-col min-h-0 ${className}`}>
      <div className="flex items-start gap-2 px-3 py-2 border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm truncate">Recent</h2>
          <p className="text-xs text-muted-foreground">
            {videos.length === 1 ? '1 video' : `${videos.length} videos`}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Hide setlist" onClick={onHide}>
          <PanelLeftClose />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
        {videos.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Videos you play will show up here.
          </p>
        ) : (
          videos.map((video, index) => (
            <RecentRow
              key={video.videoId}
              index={index}
              video={video}
              isCurrent={video.videoId === currentVideoId}
              onPlay={onPlay}
            />
          ))
        )}
      </div>
    </aside>
  );
}

interface RecentRowProps {
  index: number;
  video: RecentVideo;
  isCurrent: boolean;
  onPlay: (videoId: string) => void;
}

function RecentRow({ index, video, isCurrent, onPlay }: RecentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the video that's playing visible in the tray
  useEffect(() => {
    if (isCurrent) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isCurrent]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onPlay(video.videoId);
  };

  return (
    <div
      ref={rowRef}
      aria-current={isCurrent ? 'true' : undefined}
      className={`flex gap-2 pl-2 pr-3 py-2 border-l-2 ${
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
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          onClick={handleClick}
          className={`block text-sm font-medium leading-snug line-clamp-2 hover:underline underline-offset-4 ${
            isCurrent ? 'text-primary' : 'hover:text-primary'
          }`}
          title={video.title}
        >
          {video.title}
        </a>
        <div className="text-xs text-muted-foreground">{timeAgo(video.lastUsed)}</div>
      </div>
    </div>
  );
}
