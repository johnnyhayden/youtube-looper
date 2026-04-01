'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { usePlayer } from '@/lib/store';
import { formatTime } from '@/lib/youtube';

export default function Timeline() {
  const { state, seek, setLoopStart, setLoopEnd } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'playhead' | 'start' | 'end' | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!containerRef.current || state.duration === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(state.duration, position * state.duration));
  }, [state.duration]);

  const getPositionFromTime = useCallback((time: number): number => {
    if (state.duration === 0) return 0;
    return (time / state.duration) * 100;
  }, [state.duration]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'playhead' | 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    const time = getTimeFromPosition(e.clientX);
    seek(time);
  }, [isDragging, getTimeFromPosition, seek]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const time = getTimeFromPosition(e.clientX);
    
    if (isDragging === 'playhead') {
      seek(time);
    } else if (isDragging === 'start') {
      if (state.loop.end === null || time < state.loop.end) {
        setLoopStart(time);
      }
    } else if (isDragging === 'end') {
      if (state.loop.start === null || time > state.loop.start) {
        setLoopEnd(time);
      }
    }
  }, [isDragging, getTimeFromPosition, seek, setLoopStart, setLoopEnd, state.loop.start, state.loop.end]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleHoverMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverPosition((e.clientX - rect.left) / rect.width);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const playheadPosition = getPositionFromTime(state.currentTime);
  const loopStartPosition = state.loop.start !== null ? getPositionFromTime(state.loop.start) : null;
  const loopEndPosition = state.loop.end !== null ? getPositionFromTime(state.loop.end) : null;

  return (
    <div className="w-full space-y-2">
      {/* Time display */}
      <div className="flex justify-between text-sm text-muted-foreground font-mono">
        <span>{formatTime(state.currentTime)}</span>
        <span>{formatTime(state.duration)}</span>
      </div>

      {/* Timeline */}
      <div
        ref={containerRef}
        className="relative h-12 bg-secondary rounded-lg cursor-pointer select-none overflow-hidden"
        onClick={handleTimelineClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleHoverMove}
      >
        {/* Loop region background */}
        {loopStartPosition !== null && loopEndPosition !== null && (
          <div
            className={`absolute top-0 h-full transition-colors ${
              state.loop.enabled ? 'bg-emerald-500/30' : 'bg-muted-foreground/20'
            }`}
            style={{
              left: `${loopStartPosition}%`,
              width: `${loopEndPosition - loopStartPosition}%`,
            }}
          />
        )}

        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full bg-primary/20"
          style={{ width: `${playheadPosition}%` }}
        />

        {/* Hover indicator */}
        {isHovering && !isDragging && (
          <div
            className="absolute top-0 h-full w-0.5 bg-muted-foreground/50 pointer-events-none"
            style={{ left: `${hoverPosition * 100}%` }}
          />
        )}

        {/* Loop start handle */}
        {loopStartPosition !== null && (
          <div
            className={`absolute top-0 h-full w-1 cursor-ew-resize transition-colors ${
              state.loop.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'
            } hover:bg-emerald-400`}
            style={{ left: `${loopStartPosition}%`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-inherit" />
          </div>
        )}

        {/* Loop end handle */}
        {loopEndPosition !== null && (
          <div
            className={`absolute top-0 h-full w-1 cursor-ew-resize transition-colors ${
              state.loop.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'
            } hover:bg-emerald-400`}
            style={{ left: `${loopEndPosition}%`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-inherit" />
          </div>
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-1 bg-primary cursor-ew-resize z-10"
          style={{ left: `${playheadPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'playhead')}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-lg" />
        </div>
      </div>

      {/* Loop info */}
      {(state.loop.start !== null || state.loop.end !== null) && (
        <div className="flex justify-center gap-4 text-sm">
          <span className={state.loop.enabled ? 'text-emerald-500' : 'text-muted-foreground'}>
            Loop: {state.loop.start !== null ? formatTime(state.loop.start) : '--:--'} 
            {' → '}
            {state.loop.end !== null ? formatTime(state.loop.end) : '--:--'}
          </span>
        </div>
      )}
    </div>
  );
}





