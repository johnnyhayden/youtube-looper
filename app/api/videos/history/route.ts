import { NextResponse } from 'next/server';
import { loadVideos } from '@/lib/storage';

export interface VideoHistoryItem {
  videoId: string;
  title: string;
  lastUsed: string;
}

// GET /api/videos/history - Get recent videos sorted by last used
export async function GET() {
  try {
    const store = await loadVideos();
    
    // Convert to array and sort by lastUsed (most recent first)
    const history: VideoHistoryItem[] = Object.entries(store.videos)
      .map(([videoId, data]) => ({
        videoId,
        title: data.title || `Video ${videoId}`,
        lastUsed: data.lastUsed || new Date(0).toISOString(),
      }))
      .filter(item => item.title && item.title !== `Video ${item.videoId}`) // Only include videos with real titles
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, 10); // Keep only 10 most recent
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error loading video history:', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}





