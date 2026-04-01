'use client';

import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function PlaybackControls() {
  const { state, togglePlayPause, seekRelative, reset } = usePlayer();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Seek backward */}
      <Button
        variant="outline"
        size="lg"
        onClick={() => seekRelative(-5)}
        className="w-14 h-14 text-xl"
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
        className="w-20 h-20 text-3xl rounded-full"
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
        className="w-14 h-14 text-xl"
        title="Seek +5s (→)"
      >
        ⏩
      </Button>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        className="ml-4"
        title="Reset (R)"
      >
        Reset
      </Button>
    </div>
  );
}





