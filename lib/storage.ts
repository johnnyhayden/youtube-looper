import { Redis } from '@upstash/redis';
import type { VideosStore, VideoData, Preset, Setlist, SetlistSummary, SetlistsStore, LessonCandidate } from './types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function videosKey(userId: string): string {
  return `youtube-looper:user:${userId}:videos`;
}

// Load all videos data for a user
export async function loadVideos(userId: string): Promise<VideosStore> {
  const data = await redis.get<VideosStore>(videosKey(userId));
  return data || { videos: {} };
}

// Save all videos data for a user
async function saveVideos(userId: string, store: VideosStore): Promise<void> {
  await redis.set(videosKey(userId), store);
}

// Get video data by ID
export async function getVideo(userId: string, videoId: string): Promise<VideoData | null> {
  const store = await loadVideos(userId);
  return store.videos[videoId] || null;
}

// Save or update video data
export async function saveVideo(userId: string, videoId: string, data: VideoData): Promise<void> {
  const store = await loadVideos(userId);
  store.videos[videoId] = {
    ...data,
    lastUsed: new Date().toISOString(),
  };
  await saveVideos(userId, store);
}

// Add preset to video
export async function addPreset(userId: string, videoId: string, preset: Preset): Promise<void> {
  const store = await loadVideos(userId);

  if (!store.videos[videoId]) {
    store.videos[videoId] = {
      title: '',
      url: `https://youtube.com/watch?v=${videoId}`,
      presets: [],
      lastUsed: new Date().toISOString(),
    };
  }

  store.videos[videoId].presets.push(preset);
  store.videos[videoId].lastUsed = new Date().toISOString();

  await saveVideos(userId, store);
}

// Delete preset
export async function deletePreset(userId: string, videoId: string, presetId: string): Promise<void> {
  const store = await loadVideos(userId);

  if (store.videos[videoId]) {
    store.videos[videoId].presets = store.videos[videoId].presets.filter(
      p => p.id !== presetId
    );
    store.videos[videoId].lastUsed = new Date().toISOString();
    await saveVideos(userId, store);
  }
}

function setlistsKey(userId: string): string {
  return `youtube-looper:user:${userId}:setlists`;
}

async function loadSetlists(userId: string): Promise<SetlistsStore> {
  const data = await redis.get<SetlistsStore>(setlistsKey(userId));
  return data || { setlists: {} };
}

async function saveSetlists(userId: string, store: SetlistsStore): Promise<void> {
  await redis.set(setlistsKey(userId), store);
}

// List a user's setlists, most recently updated first
export async function listSetlists(userId: string): Promise<SetlistSummary[]> {
  const store = await loadSetlists(userId);
  return Object.values(store.setlists)
    .map((s) => ({ id: s.id, name: s.name, songCount: s.songs.length, updatedAt: s.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSetlist(userId: string, setlistId: string): Promise<Setlist | null> {
  const store = await loadSetlists(userId);
  return store.setlists[setlistId] || null;
}

export async function saveSetlist(userId: string, setlist: Setlist): Promise<void> {
  const store = await loadSetlists(userId);
  store.setlists[setlist.id] = setlist;
  await saveSetlists(userId, store);
}

export async function deleteSetlist(userId: string, setlistId: string): Promise<void> {
  const store = await loadSetlists(userId);
  delete store.setlists[setlistId];
  await saveSetlists(userId, store);
}

// Lesson search candidates are shared across users and cached to save YouTube API quota
const LESSON_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

function lessonKey(version: number, title: string, artist: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `youtube-looper:lessons:v${version}:${norm(artist)}|${norm(title)}`;
}

export async function getCachedLessonCandidates(
  version: number,
  title: string,
  artist: string
): Promise<LessonCandidate[] | null> {
  return redis.get<LessonCandidate[]>(lessonKey(version, title, artist));
}

export async function setCachedLessonCandidates(
  version: number,
  title: string,
  artist: string,
  candidates: LessonCandidate[]
): Promise<void> {
  await redis.set(lessonKey(version, title, artist), candidates, { ex: LESSON_CACHE_TTL_SECONDS });
}

// Indexed upload lists for preferred lesson channels
const CHANNEL_UPLOADS_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function getCachedChannelUploads(channelId: string): Promise<[string, string][] | null> {
  return redis.get<[string, string][]>(`youtube-looper:channel-uploads:${channelId}`);
}

export async function setCachedChannelUploads(channelId: string, uploads: [string, string][]): Promise<void> {
  await redis.set(`youtube-looper:channel-uploads:${channelId}`, uploads, { ex: CHANNEL_UPLOADS_TTL_SECONDS });
}

// A real write + read so Upstash doesn't archive the free database for inactivity
export async function touchKeepalive(): Promise<string | null> {
  const now = new Date().toISOString();
  await redis.set('youtube-looper:keepalive', now);
  return redis.get<string>('youtube-looper:keepalive');
}
