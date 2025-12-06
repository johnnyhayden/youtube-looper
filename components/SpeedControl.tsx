'use client';

import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from '@/lib/youtube';

const QUICK_SPEEDS = [25, 50, 75, 100, 125, 150];

export default function SpeedControl() {
  const { state, setSpeed, adjustSpeed } = usePlayer();

  return (
    <div className="flex flex-col gap-3">
      {/* Speed display and adjustment */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustSpeed(-SPEED_STEP)}
          disabled={state.speed <= MIN_SPEED}
          className="w-9 h-9 text-lg font-bold p-0"
        >
          −
        </Button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-bold font-mono tabular-nums">
            {state.speed}%
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustSpeed(SPEED_STEP)}
          disabled={state.speed >= MAX_SPEED}
          className="w-9 h-9 text-lg font-bold p-0"
        >
          +
        </Button>
      </div>

      {/* Speed slider */}
      <div>
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

      {/* Quick speed buttons */}
      <div className="grid grid-cols-6 gap-1">
        {QUICK_SPEEDS.map((speed) => (
          <Button
            key={speed}
            variant={state.speed === speed ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSpeed(speed)}
            className="font-mono text-xs h-7 px-1"
          >
            {speed}
          </Button>
        ))}
      </div>
    </div>
  );
}
