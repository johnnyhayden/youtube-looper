import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/auth';
import { listSetlists, getSetlist, saveSetlist, deleteSetlist } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Setlist, SetlistSong } from '@/lib/types';

const MAX_SONGS = 300;

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function sanitizeSong(raw: Record<string, unknown>, index: number): SetlistSong | null {
  const title = str(raw.title);
  if (!title) return null;
  return {
    id: str(raw.id, 100) || `row-${index}`,
    title,
    artist: str(raw.artist),
    album: str(raw.album),
    durationMs: num(raw.durationMs),
    key: num(raw.key),
    mode: num(raw.mode),
    tempo: num(raw.tempo),
  };
}

// GET /api/setlists - List setlists, or get one with ?id=xxx
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const id = request.nextUrl.searchParams.get('id');

  try {
    if (id) {
      const setlist = await getSetlist(userId, id);
      if (!setlist) return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
      return NextResponse.json({ setlist });
    }
    return NextResponse.json({ setlists: await listSetlists(userId) });
  } catch (error) {
    console.error('Error loading setlists:', error);
    return NextResponse.json({ error: 'Failed to load setlists' }, { status: 500 });
  }
}

// POST /api/setlists - Create a setlist from parsed CSV songs
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { name, songs } = await request.json();

    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json({ error: 'No songs in setlist' }, { status: 400 });
    }
    if (songs.length > MAX_SONGS) {
      return NextResponse.json({ error: `Setlists are limited to ${MAX_SONGS} songs` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const setlist: Setlist = {
      id: uuidv4(),
      name: str(name, 100) || 'Untitled setlist',
      createdAt: now,
      updatedAt: now,
      songs: songs
        .map((s, i) => (s && typeof s === 'object' ? sanitizeSong(s, i) : null))
        .filter((s): s is SetlistSong => s !== null),
    };

    await saveSetlist(userId, setlist);
    return NextResponse.json({ setlist });
  } catch (error) {
    console.error('Error creating setlist:', error);
    return NextResponse.json({ error: 'Failed to create setlist' }, { status: 500 });
  }
}

// PATCH /api/setlists - Choose a song's lesson video ({ id, songId, videoId }; null videoId resets)
export async function PATCH(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { id, songId, videoId } = await request.json();
    const setlist = await getSetlist(userId, str(id, 100));
    const song = setlist?.songs.find((s) => s.id === songId);
    if (!setlist || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    if (typeof videoId === 'string' && /^[\w-]{11}$/.test(videoId)) {
      song.videoId = videoId;
    } else {
      delete song.videoId;
    }
    setlist.updatedAt = new Date().toISOString();

    await saveSetlist(userId, setlist);
    return NextResponse.json({ setlist });
  } catch (error) {
    console.error('Error updating setlist:', error);
    return NextResponse.json({ error: 'Failed to update setlist' }, { status: 500 });
  }
}

// DELETE /api/setlists?id=xxx - Delete a setlist
export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await deleteSetlist(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setlist:', error);
    return NextResponse.json({ error: 'Failed to delete setlist' }, { status: 500 });
  }
}
