'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { usePlayer } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/youtube';
import type { Preset } from '@/lib/types';

interface PresetManagerProps {
  presets: Preset[];
  onSaveCurrentLoop: () => void;
  onRename: (presetId: string, name: string) => void;
  onDelete: (presetId: string) => void;
}

export default function PresetManager({ presets, onSaveCurrentLoop, onRename, onDelete }: PresetManagerProps) {
  const { state, loadPreset } = usePlayer();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startEditing = (preset: Preset) => {
    setEditingId(preset.id);
    setDraftName(preset.name);
  };

  const commitEdit = (preset: Preset) => {
    const name = draftName.trim();
    if (name && name !== preset.name) onRename(preset.id, name);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={onSaveCurrentLoop}
        disabled={state.loop.start === null || state.loop.end === null}
        className="w-full"
      >
        Save Current Loop (S)
      </Button>

      {presets.length === 0 ? (
        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
          No presets saved yet.
          <br />
          Press <kbd className="px-1 bg-secondary rounded">S</kbd> to save current loop.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {presets.map((preset, index) => (
              <div
                key={preset.id}
                className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => editingId !== preset.id && loadPreset(preset)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-muted-foreground font-mono text-xs shrink-0">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    {editingId === preset.id ? (
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => commitEdit(preset)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(preset);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        maxLength={100}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-background border border-input rounded px-1 -mx-1 text-sm font-medium outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <div
                        className="font-medium text-sm truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(preset);
                        }}
                        title="Double-click to rename"
                      >
                        {preset.name}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatTime(preset.start)} → {formatTime(preset.end)} @ {preset.speed}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(preset);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(preset.id);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-2 pt-1 text-xs text-muted-foreground border-t border-border">
            Press 1-9 to quick-load presets · double-click a name to rename
          </div>
        </>
      )}
    </div>
  );
}
