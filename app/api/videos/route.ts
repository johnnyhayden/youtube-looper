import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/auth';
import { getVideo, saveVideo } from '@/lib/storage';

// POST /api/videos - Save video data (merges with existing data to preserve presets)
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { videoId, data } = await request.json();

    if (!videoId || !data) {
      return NextResponse.json({ error: 'Missing videoId or data' }, { status: 400 });
    }

    // Get existing video data to preserve presets
    const existingVideo = await getVideo(userId, videoId);
    const mergedData = {
      ...data,
      presets: existingVideo?.presets || data.presets || [],
    };

    await saveVideo(userId, videoId, mergedData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving video:', error);
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
  }
}
