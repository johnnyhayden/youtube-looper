import { NextRequest, NextResponse } from 'next/server';
import { loadVideos, getVideo, saveVideo } from '@/lib/storage';

// GET /api/videos - Get all videos or specific video
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  try {
    if (videoId) {
      const video = await getVideo(videoId);
      return NextResponse.json({ video });
    } else {
      const store = await loadVideos();
      return NextResponse.json(store);
    }
  } catch (error) {
    console.error('Error loading videos:', error);
    return NextResponse.json({ error: 'Failed to load videos' }, { status: 500 });
  }
}

// POST /api/videos - Save video data (merges with existing data to preserve presets)
export async function POST(request: NextRequest) {
  try {
    const { videoId, data } = await request.json();

    if (!videoId || !data) {
      return NextResponse.json({ error: 'Missing videoId or data' }, { status: 400 });
    }

    // Get existing video data to preserve presets
    const existingVideo = await getVideo(videoId);
    const mergedData = {
      ...data,
      presets: existingVideo?.presets || data.presets || [],
    };

    await saveVideo(videoId, mergedData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving video:', error);
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
  }
}

