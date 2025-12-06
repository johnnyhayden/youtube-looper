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
    <div className="flex flex-col gap-4">
      {/* Loop point buttons */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <Button
            variant="outline"
            size="lg"
            onClick={setLoopStartAtCurrent}
            className="w-full font-mono text-lg h-14"
          >
            <span className="text-muted-foreground mr-2">[</span>
            Set Start
            {state.loop.start !== null && (
              <span className="ml-2 text-emerald-500">{formatTime(state.loop.start)}</span>
            )}
          </Button>
          {state.loop.start !== null && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seek(state.loop.start!)}
                className="flex-1 text-xs"
              >
                Go to
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopStart(null)}
                className="text-xs text-destructive"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <Button
            variant="outline"
            size="lg"
            onClick={setLoopEndAtCurrent}
            className="w-full font-mono text-lg h-14"
          >
            <span className="text-muted-foreground mr-2">]</span>
            Set End
            {state.loop.end !== null && (
              <span className="ml-2 text-emerald-500">{formatTime(state.loop.end)}</span>
            )}
          </Button>
          {state.loop.end !== null && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => seek(state.loop.end!)}
                className="flex-1 text-xs"
              >
                Go to
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoopEnd(null)}
                className="text-xs text-destructive"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Loop toggle */}
      <Button
        variant={state.loop.enabled ? 'default' : 'outline'}
        size="lg"
        onClick={toggleLoop}
        disabled={!canEnableLoop}
        className={`w-full h-14 text-lg font-semibold transition-all ${
          state.loop.enabled
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : ''
        }`}
      >
        {state.loop.enabled ? '⟳ Loop Active' : 'Enable Loop (L)'}
      </Button>

      {/* Loop duration info */}
      {hasLoopPoints && (
        <div className="text-center text-sm text-muted-foreground">
          Loop duration: {formatTime(state.loop.end! - state.loop.start!)}
        </div>
      )}
    </div>
  );
}

