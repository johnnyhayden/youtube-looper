'use client';

import { Check, ListMusic, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SetlistSummary } from '@/lib/types';

interface SetlistMenuProps {
  setlists: SetlistSummary[];
  activeId: string | null; // A setlist ID, or "recent"
  recentCount: number;
  onOpen: (id: string) => void;
  onImport: () => void;
}

export default function SetlistMenu({ setlists, activeId, recentCount, onOpen, onImport }: SetlistMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          title="Setlists"
        >
          <ListMusic />
          <span className="text-xs hidden sm:inline">Setlists</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          Setlists
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onOpen('recent')}>
          <Check className={activeId === 'recent' ? '' : 'invisible'} />
          <span className="flex-1 truncate">Recent</span>
          <span className="text-xs text-muted-foreground">{recentCount}</span>
        </DropdownMenuItem>
        {setlists.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => onOpen(s.id)}>
            <Check className={s.id === activeId ? '' : 'invisible'} />
            <span className="flex-1 truncate">{s.name}</span>
            <span className="text-xs text-muted-foreground">{s.songCount}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImport}>
          <Upload />
          Upload CSV setlist…
        </DropdownMenuItem>
        <a
          href="https://exportify.net"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Export a Spotify playlist with Exportify ↗
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
