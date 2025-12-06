'use client';

import { useState } from 'react';
import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatTime } from '@/lib/youtube';
import type { Preset } from '@/lib/types';

interface PresetManagerProps {
  presets: Preset[];
  onSave: (preset: Omit<Preset, 'id'>) => void;
  onDelete: (presetId: string) => void;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

export default function PresetManager({
  presets,
  onSave,
  onDelete,
  dialogOpen,
  onDialogOpenChange,
}: PresetManagerProps) {
  const { state, loadPreset } = usePlayer();
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (!presetName.trim()) return;
    if (state.loop.start === null || state.loop.end === null) return;

    onSave({
      name: presetName.trim(),
      start: state.loop.start,
      end: state.loop.end,
      speed: state.speed,
    });

    setPresetName('');
    onDialogOpenChange(false);
  };

  const suggestedName = state.loop.start !== null && state.loop.end !== null
    ? `Loop ${formatTime(state.loop.start)}-${formatTime(state.loop.end)} @ ${state.speed}%`
    : '';

  return (
    <>
      {/* Presets dropdown */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between">
              <span>Presets ({presets.length})</span>
              <span className="text-muted-foreground">▼</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            {presets.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No presets saved yet.
                <br />
                Press <kbd className="px-1 bg-secondary rounded">S</kbd> to save current loop.
              </div>
            ) : (
              <>
                {presets.map((preset, index) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => loadPreset(preset)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {index + 1}.
                      </span>
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(preset.start)} → {formatTime(preset.end)} @ {preset.speed}%
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(preset.id);
                      }}
                    >
                      ×
                    </Button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Press 1-9 to quick-load presets
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="secondary"
          onClick={() => onDialogOpenChange(true)}
          disabled={state.loop.start === null || state.loop.end === null}
        >
          Save (S)
        </Button>
      </div>

      {/* Save preset dialog */}
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Preset Name</label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={suggestedName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Loop: {state.loop.start !== null ? formatTime(state.loop.start) : '--:--'} →{' '}
                {state.loop.end !== null ? formatTime(state.loop.end) : '--:--'}
              </div>
              <div>Speed: {state.speed}%</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

