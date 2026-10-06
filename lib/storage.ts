import { Redis } from '@upstash/redis';
import type { VideosStore, VideoData, Preset } from './types';

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
