'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '@/lib/store';
import { speedToYouTube } from '@/lib/youtube';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  destroy: () => void;
  getVideoData: () => { title: string; video_id: string; author: string };
}

interface YouTubePlayerProps {
  videoId: string;
  onTitleLoaded?: (title: string) => void;
}

export default function YouTubePlayer({ videoId, onTitleLoaded }: YouTubePlayerProps) {
  const { playerRef, state, updateTime, updateDuration, updatePlaying } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayerInstance | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isApiReady = useRef(false);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT || playerInstanceRef.current) return;

    // Create a div for the player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player-' + Date.now();
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(playerDiv);

    playerInstanceRef.current = new window.YT.Player(playerDiv.id, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        fs: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          playerRef.current = event.target;
          updateDuration(event.target.getDuration());
          // Set initial speed
          event.target.setPlaybackRate(speedToYouTube(state.speed));
          // Get video title after a short delay (YouTube API needs time to load metadata)
          setTimeout(() => {
            try {
              const videoData = event.target.getVideoData();
              if (videoData?.title && onTitleLoaded) {
                onTitleLoaded(videoData.title);
              }
            } catch (e) {
              console.error('Error getting video title:', e);
            }
          }, 500);
        },
        onStateChange: (event) => {
          const isPlaying = event.data === window.YT.PlayerState.PLAYING;
          updatePlaying(isPlaying);

          if (isPlaying) {
            // Start time updates
            if (timeUpdateIntervalRef.current) {
              clearInterval(timeUpdateIntervalRef.current);
            }
            timeUpdateIntervalRef.current = setInterval(() => {
              if (playerInstanceRef.current) {
                updateTime(playerInstanceRef.current.getCurrentTime());
              }
            }, 100);
          } else {
            // Stop time updates
            if (timeUpdateIntervalRef.current) {
              clearInterval(timeUpdateIntervalRef.current);
              timeUpdateIntervalRef.current = null;
            }
            // Update time one more time when paused
            if (playerInstanceRef.current) {
              updateTime(playerInstanceRef.current.getCurrentTime());
            }
          }

          // Update duration when video loads
          if (event.data === window.YT.PlayerState.PLAYING && playerInstanceRef.current) {
            updateDuration(playerInstanceRef.current.getDuration());
          }
        },
      },
    });
  }, [videoId, playerRef, state.speed, updateTime, updateDuration, updatePlaying]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isApiReady.current = true;
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      isApiReady.current = true;
      initPlayer();
    };

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [initPlayer]);

  // Handle video ID changes
  useEffect(() => {
    if (isApiReady.current && videoId) {
      // Destroy old player
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
        playerRef.current = null;
      }
      initPlayer();
    }
  }, [videoId, initPlayer, playerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
    </div>
  );
}

