import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { VideosStore, VideoData, Preset, MidiConfig, MidiAction } from './types';

const DATA_DIR = path.join(os.homedir(), '.youtube-looper');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const MIDI_CONFIG_FILE = path.join(DATA_DIR, 'midi-config.json');

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

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
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(VIDEOS_FILE, 'utf-8');
    return JSON.parse(data) as VideosStore;
  } catch {
    return { videos: {} };
  }
}

// Save all videos data
export async function saveVideos(store: VideosStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(VIDEOS_FILE, JSON.stringify(store, null, 2));
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
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(MIDI_CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as MidiConfig;
  } catch {
    // Create default config
    await saveMidiConfig(defaultMidiConfig);
    return defaultMidiConfig;
  }
}

// Save MIDI config
export async function saveMidiConfig(config: MidiConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(MIDI_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get data directory path (for display in UI)
export function getDataDir(): string {
  return DATA_DIR;
}





