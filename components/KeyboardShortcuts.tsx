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

  const midiMappings = [
    { cc: '1', action: 'Play / Pause' },
    { cc: '2', action: 'Toggle loop' },
    { cc: '3', action: 'Next preset' },
    { cc: '4', action: 'Previous preset' },
    { cc: '5', action: 'Speed down' },
    { cc: '6', action: 'Speed up' },
    { cc: '7', action: 'Set speed (0-127 → 25-200%)' },
  ];

  return (
    <div className="space-y-6">
      {/* Keyboard Shortcuts */}
      <div>
        <h4 className="text-sm font-medium mb-2">Keyboard</h4>
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
      </div>

      {/* Helix Floor Setup */}
      <div>
        <h4 className="text-sm font-medium mb-2">🎸 Helix Floor Setup</h4>
        <div className="text-sm text-muted-foreground space-y-3">
          <div>
            <p className="font-medium text-foreground mb-1">1. Start the MIDI Bridge</p>
            <p>Run this command in a terminal:</p>
            <code className="block mt-1 px-2 py-1 bg-secondary rounded text-xs font-mono">
              cd midi-bridge && npm install && node server.js
            </code>
          </div>
          
          <div>
            <p className="font-medium text-foreground mb-1">2. Connect Helix Floor via USB</p>
            <p>The bridge will auto-detect your Helix when connected.</p>
          </div>
          
          <div>
            <p className="font-medium text-foreground mb-1">3. Configure Helix Command Center</p>
            <p>In HX Edit, set up footswitches to send MIDI CC messages:</p>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              <li>Command: <span className="font-mono">CC Toggle</span> or <span className="font-mono">CC Momentary</span></li>
              <li>MIDI Ch: <span className="font-mono">1</span> (or any channel)</li>
              <li>CC#: See mappings below</li>
              <li>Value: <span className="font-mono">0-127</span></li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground mb-2">Default MIDI CC Mappings</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {midiMappings.map(({ cc, action }) => (
                <div key={cc} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-secondary rounded text-xs font-mono min-w-[45px] text-center">
                    CC {cc}
                  </span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Custom Mappings</p>
            <p>Edit the config file to customize CC assignments:</p>
            <code className="block mt-1 px-2 py-1 bg-secondary rounded text-xs font-mono">
              ~/.youtube-looper/midi-config.json
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

