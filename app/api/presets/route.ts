import { NextRequest, NextResponse } from 'next/server';
import { addPreset, updatePreset, deletePreset, getVideo } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Preset } from '@/lib/types';

// GET /api/presets?videoId=xxx - Get presets for a video
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  try {
    const video = await getVideo(videoId);
    return NextResponse.json({ presets: video?.presets || [] });
  } catch (error) {
    console.error('Error loading presets:', error);
    return NextResponse.json({ error: 'Failed to load presets' }, { status: 500 });
  }
}

// POST /api/presets - Add a new preset
export async function POST(request: NextRequest) {
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

    await addPreset(videoId, newPreset);
    return NextResponse.json({ preset: newPreset });
  } catch (error) {
    console.error('Error adding preset:', error);
    return NextResponse.json({ error: 'Failed to add preset' }, { status: 500 });
  }
}

// PUT /api/presets - Update a preset
export async function PUT(request: NextRequest) {
  try {
    const { videoId, preset } = await request.json();

    if (!videoId || !preset || !preset.id) {
      return NextResponse.json({ error: 'Missing videoId or preset' }, { status: 400 });
    }

    await updatePreset(videoId, preset);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating preset:', error);
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

// DELETE /api/presets - Delete a preset
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const presetId = searchParams.get('presetId');

  if (!videoId || !presetId) {
    return NextResponse.json({ error: 'Missing videoId or presetId' }, { status: 400 });
  }

  try {
    await deletePreset(videoId, presetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}





