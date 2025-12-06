'use client';

import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/youtube';

export default function LoopControls() {
  const {
    state,
    setLoopStartAtCurrent,
    setLoopEndAtCurrent,
    setLoopStart,
    setLoopEnd,
    toggleLoop,
    seek,
  } = usePlayer();

  const hasLoopPoints = state.loop.start !== null && state.loop.end !== null;
  const canEnableLoop = hasLoopPoints && state.loop.start! < state.loop.end!;

  return (
    <div className="flex flex-col gap-3">
      {/* Loop point buttons - compact row */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={setLoopStartAtCurrent}
          className="flex-1 h-8 text-xs font-medium gap-1"
        >
          Set Start
          {state.loop.start !== null && (
            <span className="text-primary font-mono">{formatTime(state.loop.start)}</span>
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={setLoopEndAtCurrent}
          className="flex-1 h-8 text-xs font-medium gap-1"
        >
          Set End
          {state.loop.end !== null && (
            <span className="text-primary font-mono">{formatTime(state.loop.end)}</span>
          )}
        </Button>
      </div>

      {/* Clear/Go to actions when loop points exist */}
      {(state.loop.start !== null || state.loop.end !== null) && (
        <div className="flex items-center gap-1 text-xs">
          {state.loop.start !== null && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seek(state.loop.start!)}
                className="h-6 px-2 text-xs"
              >
                Go to start
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopStart(null)}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              >
                ×
              </Button>
            </>
          )}
          {state.loop.start !== null && state.loop.end !== null && (
            <span className="text-muted-foreground mx-1">|</span>
          )}
          {state.loop.end !== null && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seek(state.loop.end!)}
                className="h-6 px-2 text-xs"
              >
                Go to end
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopEnd(null)}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              >
                ×
              </Button>
            </>
          )}
        </div>
      )}

      {/* Loop toggle */}
      <Button
        variant={state.loop.enabled ? 'default' : 'outline'}
        size="sm"
        onClick={toggleLoop}
        disabled={!canEnableLoop}
        className={`w-full h-9 text-sm font-medium transition-all ${
          state.loop.enabled
            ? 'bg-primary hover:bg-primary/90'
            : ''
        }`}
      >
        {state.loop.enabled ? '⟳ Loop Active' : 'Enable Loop'}
        {hasLoopPoints && (
          <span className="ml-2 text-xs opacity-70">
            ({formatTime(state.loop.end! - state.loop.start!)})
          </span>
        )}
      </Button>
    </div>
  );
}
