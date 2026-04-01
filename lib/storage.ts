import { Redis } from '@upstash/redis';
import type { VideosStore, VideoData, Preset, MidiConfig } from './types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const VIDEOS_KEY = 'youtube-looper:videos';
const MIDI_CONFIG_KEY = 'youtube-looper:midi-config';

// Default MIDI configuration
const defaultMidiConfig: MidiConfig = {
  mappings: {
    1: 'play_pause',
    2: 'toggle_loop',
    3: 'next_preset',
    4: 'prev_preset',
    5: 'speed_down',
    6: 'speed_up',
    7: 'set_speed',
  },
};

// Load all videos data
export async function loadVideos(): Promise<VideosStore> {
  const data = await redis.get<VideosStore>(VIDEOS_KEY);
  return data || { videos: {} };
}

// Save all videos data
export async function saveVideos(store: VideosStore): Promise<void> {
  await redis.set(VIDEOS_KEY, store);
}

// Get video data by ID
export async function getVideo(videoId: string): Promise<VideoData | null> {
  const store = await loadVideos();
  return store.videos[videoId] || null;
}

// Save or update video data
export async function saveVideo(videoId: string, data: VideoData): Promise<void> {
  const store = await loadVideos();
  store.videos[videoId] = {
    ...data,
    lastUsed: new Date().toISOString(),
  };
  await saveVideos(store);
}

// Add preset to video
export async function addPreset(videoId: string, preset: Preset): Promise<void> {
  const store = await loadVideos();

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

  await saveVideos(store);
}

// Update preset
export async function updatePreset(videoId: string, preset: Preset): Promise<void> {
  const store = await loadVideos();

  if (store.videos[videoId]) {
    const index = store.videos[videoId].presets.findIndex(p => p.id === preset.id);
    if (index !== -1) {
      store.videos[videoId].presets[index] = preset;
      store.videos[videoId].lastUsed = new Date().toISOString();
      await saveVideos(store);
    }
  }
}

// Delete preset
export async function deletePreset(videoId: string, presetId: string): Promise<void> {
  const store = await loadVideos();

  if (store.videos[videoId]) {
    store.videos[videoId].presets = store.videos[videoId].presets.filter(
      p => p.id !== presetId
    );
    store.videos[videoId].lastUsed = new Date().toISOString();
    await saveVideos(store);
  }
}

// Load MIDI config
export async function loadMidiConfig(): Promise<MidiConfig> {
  const data = await redis.get<MidiConfig>(MIDI_CONFIG_KEY);
  if (data) return data;

  // Create default config
  await saveMidiConfig(defaultMidiConfig);
  return defaultMidiConfig;
}

// Save MIDI config
export async function saveMidiConfig(config: MidiConfig): Promise<void> {
  await redis.set(MIDI_CONFIG_KEY, config);
}
