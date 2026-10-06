export interface Preset {
  id: string;
  name: string;
  start: number;
  end: number;
  speed: number;
}

export interface VideoData {
  title: string;
  url: string;
  presets: Preset[];
  lastUsed: string;
}

export interface VideosStore {
  videos: Record<string, VideoData>;
}

export interface RecentVideo {
  videoId: string;
  title: string;
  lastUsed: string;
}

export interface LoopState {
  start: number | null;
  end: number | null;
  enabled: boolean;
}

export interface PlayerState {
  videoId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  loop: LoopState;
}

export interface MidiConfig {
  mappings: Record<number, MidiAction>;
}

export type MidiAction =
  | 'play_pause'
  | 'toggle_loop'
  | 'next_preset'
  | 'prev_preset'
  | 'speed_down'
  | 'speed_up'
  | 'set_speed';

export interface SetlistSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number | null;
  key: number | null; // Pitch class (0 = C ... 11 = B)
  mode: number | null; // 1 = major, 0 = minor
  tempo: number | null;
  videoId?: string; // User-chosen lesson video, overrides the best match
}

export interface Setlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  songs: SetlistSong[];
}

export interface SetlistSummary {
  id: string;
  name: string;
  songCount: number;
  updatedAt: string;
}

export interface SetlistsStore {
  setlists: Record<string, Setlist>;
}

export interface LessonVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  subscriberCount: number | null;
  durationSec: number;
  hasTabs: boolean;
  hasSolo: boolean;
  score: number;
  startSec?: number; // Where the lesson starts, skipping a description "Intro" chapter
}

// Raw YouTube search result, cached so ranking can change without new API calls
export interface LessonCandidate {
  videoId: string;
  title: string;
  description: string;
  tags: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  subscriberCount: number | null;
  durationSec: number;
}
