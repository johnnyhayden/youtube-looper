'use client';

import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function PlaybackControls() {
  const { state, togglePlayPause, seekRelative, seek, reset } = usePlayer();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main transport row */}
      <div className="flex items-center justify-center gap-2">
        {/* Seek backward */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => seekRelative(-5)}
          className="w-12 h-12 text-lg"
          title="Seek -5s (←)"
        >
          ⏪
        </Button>

        {/* Fine seek backward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => seekRelative(-1)}
          className="w-10 h-10"
          title="Seek -1s (Shift+←)"
        >
          -1s
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="lg"
          onClick={togglePlayPause}
          className="w-16 h-16 text-2xl rounded-full"
          title="Play/Pause (Space)"
        >
          {state.isPlaying ? '⏸' : '▶'}
        </Button>

        {/* Fine seek forward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => seekRelative(1)}
          className="w-10 h-10"
          title="Seek +1s (Shift+→)"
        >
          +1s
        </Button>

        {/* Seek forward */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => seekRelative(5)}
          className="w-12 h-12 text-lg"
          title="Seek +5s (→)"
        >
          ⏩
        </Button>
      </div>

      {/* Secondary row: restart to beginning + full reset */}
      <div className="flex items-center justify-center gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={() => seek(0)}
          className="flex-1 h-8 text-xs"
          title="Restart from beginning"
        >
          ⏮ Restart
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="flex-1 h-8 text-xs"
          title="Reset speed, loop, and position (R)"
        >
          ↻ Reset All
        </Button>
      </div>
    </div>
  );
}





