// Extract YouTube video ID from various URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Format seconds to mm:ss or hh:mm:ss
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse time string (mm:ss or hh:mm:ss) to seconds
export function parseTime(timeStr: string): number | null {
  const parts = timeStr.split(':').map(Number);
  
  if (parts.some(isNaN)) return null;
  
  if (parts.length === 2) {
    const [mins, secs] = parts;
    return mins * 60 + secs;
  } else if (parts.length === 3) {
    const [hrs, mins, secs] = parts;
    return hrs * 3600 + mins * 60 + secs;
  }
  
  return null;
}

// Speed utilities
export const MIN_SPEED = 25;
export const MAX_SPEED = 200;
export const SPEED_STEP = 5;

export function clampSpeed(speed: number): number {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
}

export function speedToYouTube(speed: number): number {
  // YouTube API uses 0.25-2.0 scale
  return speed / 100;
}

export function youtubeToSpeed(rate: number): number {
  return Math.round(rate * 100);
}





