import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/auth';
import {
  getCachedLessonCandidates,
  setCachedLessonCandidates,
  getCachedChannelUploads,
  setCachedChannelUploads,
} from '@/lib/storage';
import {
  fetchChannelUploads,
  fetchLessonCandidates,
  matchChannelUploads,
  rankLessonCandidates,
  LessonLookupError,
  LESSON_SEARCH_VERSION,
  PREFERRED_CHANNELS,
  type ChannelUploads,
} from '@/lib/lessons';

const MAX_RESULTS = 5;

// Dedupes concurrent upload-list fetches within this server instance
const uploadsInFlight = new Map<string, Promise<ChannelUploads>>();

async function getChannelUploads(channelId: string): Promise<ChannelUploads> {
  const cached = await getCachedChannelUploads(channelId);
  if (cached) return cached;

  let pending = uploadsInFlight.get(channelId);
  if (!pending) {
    pending = fetchChannelUploads(channelId)
      .then(async (uploads) => {
        await setCachedChannelUploads(channelId, uploads);
        return uploads;
      })
      .finally(() => uploadsInFlight.delete(channelId));
    uploadsInFlight.set(channelId, pending);
  }
  return pending;
}

// Lessons for this song from preferred channels (a failure here shouldn't block search)
async function findPreferredLessons(title: string, artist: string): Promise<string[]> {
  const matches = await Promise.all(
    PREFERRED_CHANNELS.map(async (channel) => {
      try {
        return matchChannelUploads(await getChannelUploads(channel.id), title, artist);
      } catch (error) {
        console.error(`Error indexing ${channel.name} uploads:`, error);
        return [];
      }
    })
  );
  return matches.flat();
}

// GET /api/lessons?title=xxx&artist=yyy - Best guitar solo lesson videos for a song
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const title = request.nextUrl.searchParams.get('title')?.trim().slice(0, 300);
  const artist = request.nextUrl.searchParams.get('artist')?.trim().slice(0, 300) || '';
  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }

  try {
    let candidates = await getCachedLessonCandidates(LESSON_SEARCH_VERSION, title, artist);
    if (!candidates) {
      candidates = await fetchLessonCandidates(title, artist, await findPreferredLessons(title, artist));
      await setCachedLessonCandidates(LESSON_SEARCH_VERSION, title, artist, candidates);
    }

    const videos = rankLessonCandidates(candidates, title, artist).slice(0, MAX_RESULTS);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error finding lesson videos:', error);
    const message = error instanceof LessonLookupError ? error.message : 'Failed to find lesson videos';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
