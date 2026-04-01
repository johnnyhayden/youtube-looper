'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface VideoHistoryItem {
  videoId: string;
  title: string;
  lastUsed: string;
}

interface VideoHistoryProps {
  onSelect: (videoId: string) => void;
  currentVideoId: string | null;
}

export default function VideoHistory({ onSelect, currentVideoId }: VideoHistoryProps) {
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history on mount and when video changes
  useEffect(() => {
    fetchHistory();
  }, [currentVideoId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/videos/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching video history:', err);
    }
  };

  const handleSelect = (videoId: string) => {
    onSelect(videoId);
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        title="Recent videos"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="ml-1.5 text-xs hidden sm:inline">Recent</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Videos
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {history.map((item) => (
              <button
                key={item.videoId}
                onClick={() => handleSelect(item.videoId)}
                className={`w-full px-3 py-2.5 text-left hover:bg-accent transition-colors flex items-start gap-3 ${
                  currentVideoId === item.videoId ? 'bg-accent/50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(item.lastUsed)}
                  </div>
                </div>
                {currentVideoId === item.videoId && (
                  <div className="text-xs text-primary font-medium shrink-0">
                    Playing
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





