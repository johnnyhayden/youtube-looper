import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/auth';
import { addPreset, deletePreset, getVideo } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Preset } from '@/lib/types';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET /api/presets?videoId=xxx - Get presets for a video
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  try {
    const video = await getVideo(userId, videoId);
    return NextResponse.json({ presets: video?.presets || [] });
  } catch (error) {
    console.error('Error loading presets:', error);
    return NextResponse.json({ error: 'Failed to load presets' }, { status: 500 });
  }
}

// POST /api/presets - Add a new preset
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const { videoId, preset } = await request.json();

    if (!videoId || !preset) {
      return NextResponse.json({ error: 'Missing videoId or preset' }, { status: 400 });
    }

    const newPreset: Preset = {
      id: uuidv4(),
      name: preset.name,
      start: preset.start,
      end: preset.end,
      speed: preset.speed,
    };

    await addPreset(userId, videoId, newPreset);
    return NextResponse.json({ preset: newPreset });
  } catch (error) {
    console.error('Error adding preset:', error);
    return NextResponse.json({ error: 'Failed to add preset' }, { status: 500 });
  }
}

// DELETE /api/presets - Delete a preset
export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const presetId = searchParams.get('presetId');

  if (!videoId || !presetId) {
    return NextResponse.json({ error: 'Missing videoId or presetId' }, { status: 400 });
  }

  try {
    await deletePreset(userId, videoId, presetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
