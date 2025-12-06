'use client';

import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '@/lib/youtube';

const QUICK_SPEEDS = [25, 50, 75, 100, 125, 150];

export default function SpeedControl() {
  const { state, setSpeed, adjustSpeed } = usePlayer();

  return (
    <div className="flex flex-col gap-4">
      {/* Current speed display */}
      <div className="text-center">
        <div className="text-5xl font-bold font-mono tabular-nums">
          {state.speed}%
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Playback Speed
        </div>
      </div>

      {/* Speed slider */}
      <div className="px-2">
        <Slider
          value={[state.speed]}
          onValueChange={([value]) => setSpeed(value)}
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={SPEED_STEP}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{MIN_SPEED}%</span>
          <span>{MAX_SPEED}%</span>
        </div>
      </div>

      {/* Fine adjustment buttons */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => adjustSpeed(-SPEED_STEP)}
          disabled={state.speed <= MIN_SPEED}
          className="w-16 h-12 text-xl font-bold"
        >
          −
        </Button>
        <div className="w-20 text-center text-sm text-muted-foreground">
          ±{SPEED_STEP}%
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => adjustSpeed(SPEED_STEP)}
          disabled={state.speed >= MAX_SPEED}
          className="w-16 h-12 text-xl font-bold"
        >
          +
        </Button>
      </div>

      {/* Quick speed buttons */}
      <div className="grid grid-cols-6 gap-1">
        {QUICK_SPEEDS.map((speed) => (
          <Button
            key={speed}
            variant={state.speed === speed ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSpeed(speed)}
            className="font-mono text-xs"
          >
            {speed}%
          </Button>
        ))}
      </div>
    </div>
  );
}

