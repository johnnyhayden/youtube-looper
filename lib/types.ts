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

export interface MidiMessage {
  type: 'cc';
  channel: number;
  controller: number;
  value: number;
}





