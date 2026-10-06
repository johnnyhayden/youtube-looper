'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UserMenu() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={user.email || undefined}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ redirectTo: '/signin' })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
