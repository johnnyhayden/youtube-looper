'use client';

import { useEffect, useCallback } from 'react';
import { usePlayer } from '@/lib/store';
import { SPEED_STEP } from '@/lib/youtube';
import type { Preset } from '@/lib/types';

interface KeyboardShortcutsProps {
  presets: Preset[];
  onSavePreset: () => void;
}

export default function KeyboardShortcuts({ presets, onSavePreset }: KeyboardShortcutsProps) {
  const {
    togglePlayPause,
    seekRelative,
    adjustSpeed,
    setLoopStartAtCurrent,
    setLoopEndAtCurrent,
    toggleLoop,
    loadPreset,
    reset,
  } = usePlayer();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;

      case '[':
        e.preventDefault();
        setLoopStartAtCurrent();
        break;

      case ']':
        e.preventDefault();
        setLoopEndAtCurrent();
        break;

      case 'l':
      case 'L':
        e.preventDefault();
        toggleLoop();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        seekRelative(e.shiftKey ? -1 : -5);
        break;

      case 'ArrowRight':
        e.preventDefault();
        seekRelative(e.shiftKey ? 1 : 5);
        break;

      case '-':
      case '_':
        e.preventDefault();
        adjustSpeed(-SPEED_STEP);
        break;

      case '=':
      case '+':
        e.preventDefault();
        adjustSpeed(SPEED_STEP);
        break;

      case 's':
      case 'S':
        e.preventDefault();
        onSavePreset();
        break;

      case 'r':
      case 'R':
        e.preventDefault();
        reset();
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        const presetIndex = parseInt(e.key) - 1;
        if (presets[presetIndex]) {
          loadPreset(presets[presetIndex]);
        }
        break;
    }
  }, [
    togglePlayPause,
    seekRelative,
    adjustSpeed,
    setLoopStartAtCurrent,
    setLoopEndAtCurrent,
    toggleLoop,
    loadPreset,
    reset,
    presets,
    onSavePreset,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

// Keyboard shortcuts help display
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: '[', action: 'Set loop start' },
    { key: ']', action: 'Set loop end' },
    { key: 'L', action: 'Toggle loop' },
    { key: '← / →', action: 'Seek ±5s' },
    { key: 'Shift + ← / →', action: 'Seek ±1s' },
    { key: '− / +', action: 'Speed ±5%' },
    { key: '1-9', action: 'Load preset' },
    { key: 'S', action: 'Save preset' },
    { key: 'R', action: 'Reset' },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {shortcuts.map(({ key, action }) => (
        <div key={key} className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 bg-secondary rounded text-xs font-mono min-w-[60px] text-center">
            {key}
          </kbd>
          <span className="text-muted-foreground">{action}</span>
        </div>
      ))}
    </div>
  );
}

