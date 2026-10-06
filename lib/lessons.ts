import type { LessonCandidate, LessonVideo } from './types';

const API = 'https://www.googleapis.com/youtube/v3';

// Channels known for high-quality song lessons
const LESSON_CHANNELS = [
  'marty music',
  'andy guitar',
  'justinguitar',
  'justin guitar',
  'lauren bateman guitar',
  'your guitar academy',
  'next level guitar',
  'guitarlessons365song',
  'eric blackmon guitar',
  'swiftlessons',
  'andy crowley',
  'guitarzero2hero',
  'truefire',
  'fender',
  'guitar world',
];

// Channels whose tab lessons are consistently great. Their full upload lists are
// indexed, so their lesson for a song is always considered even if search misses it.
export const PREFERRED_CHANNELS = [{ id: 'UCLN8LV-ojTQP2wPtDg1kvGQ', name: 'DadRock TABS', bonus: 10 }];

// Other instruments (only off-topic when the video isn't also about guitar)
const OTHER_INSTRUMENT = /\b(bass|drums?|piano|keyboards?|ukulele|uke|harmonica|banjo|mandolin)\b/;
// Formats that aren't a lesson
const OFF_TOPIC = /\b(karaoke|backing track|reaction|vocals?|singing|full album|official (music )?video|lyrics?)\b/;

export class LessonLookupError extends Error {}

interface SearchItem {
  id: { videoId: string };
}

interface VideoItem {
  id: string;
  snippet: { title: string; description: string; channelId: string; channelTitle: string; tags?: string[] };
  statistics: { viewCount?: string };
  contentDetails: { duration: string };
}

interface PlaylistItem {
  snippet: { title: string; resourceId: { videoId: string } };
}

interface ChannelItem {
  id: string;
  statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

// Fraction of the song's title words that appear in the video title.
// Prefix matching lets "fallin" match "falling".
function titleMatch(songTitle: string, videoTitle: string): number {
  const want = tokens(songTitle.replace(/\(.*?\)/g, ''));
  if (want.length === 0) return 0;
  const have = tokens(videoTitle);
  const hits = want.filter((w) =>
    have.some((h) => h === w || (w.length >= 4 && (h.startsWith(w) || w.startsWith(h)) && h.length >= 4))
  );
  return hits.length / want.length;
}

// ISO 8601 duration ("PT12M34S") -> seconds
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function scoreCandidate(
  video: LessonCandidate,
  songTitle: string,
  artist: string
): { score: number; hasTabs: boolean; hasSolo: boolean } {
  const title = normalize(video.title);
  const details = normalize(`${video.description} ${video.tags}`);
  const channel = normalize(video.channelTitle);
  const songWords = normalize(songTitle);

  let score = 0;

  // Must actually be this song
  const match = titleMatch(songTitle, video.title);
  score += match * 6;
  if (match < 0.6) score -= 12;

  const artistTokens = tokens(artist).filter((t) => t !== 'the' && t !== 'and');
  if (artistTokens.length && artistTokens.every((t) => `${title} ${details}`.includes(t))) {
    score += 2;
  }

  // Solos are the main goal, so they're the strongest signal
  const soloInTitle = /\bsolos?\b/.test(title);
  const soloInDetails = /\bsolos?\b/.test(details);
  if (soloInTitle) score += 7;
  else if (/\blead (guitar|parts?)\b/.test(title)) score += 4;
  else if (soloInDetails) score += 2.5;
  if (/\b(riffs?|licks?|fills?)\b/.test(title)) score += 1;
  if (/\belectric\b/.test(title)) score += 1;

  // Tabs make a lesson much easier to follow
  const tabsInTitle = /\b(tabs?|tablature)\b/.test(title);
  const tabsInDetails = /\b(tabs?|tablature)\b/.test(details);
  if (tabsInTitle) score += 4;
  else if (tabsInDetails) score += 2;

  if (/\b(lesson|tutorial|how to play)\b/.test(title)) score += 3;
  else if (/\b(lesson|tutorial|how to play)\b/.test(details)) score += 1;
  if (/\bguitar\b/.test(title)) score += 1;

  // Popularity and channel prominence (log scale so mega-hits don't dominate)
  score += Math.log10(video.viewCount + 1) * 1.2;
  if (video.subscriberCount !== null) score += Math.log10(video.subscriberCount + 1) * 0.6;
  if (LESSON_CHANNELS.some((c) => channel.includes(c))) score += 3;

  // Chord/strumming lessons rarely cover the solo
  if (!soloInTitle && /\b(easy|beginner|chords?|strumming|acoustic|no capo|simple)\b/.test(title)) score -= 3;

  const preferred = PREFERRED_CHANNELS.find((c) => c.id === video.channelId);
  if (preferred) score += preferred.bonus;

  // Penalties: other instruments, music videos, covers, shorts, marathon streams
  const instrument = title.match(OTHER_INSTRUMENT);
  if (instrument && !/\bguitar\b/.test(title) && !songWords.includes(instrument[0])) score -= 6;
  const offTopic = title.match(OFF_TOPIC);
  if (offTopic && !songWords.includes(offTopic[0])) score -= 6;
  if (/\bcover\b/.test(title) && !/\b(lesson|tutorial|tabs?)\b/.test(title)) score -= 3;
  if (/vevo$|\btopic$/.test(channel)) score -= 8; // Official/auto-generated music channels
  if (video.durationSec < 120) score -= 6;
  if (video.durationSec > 60 * 60) score -= 3;

  return {
    score: Math.round(score * 10) / 10,
    hasTabs: tabsInTitle || tabsInDetails,
    hasSolo: soloInTitle || soloInDetails,
  };
}

async function youtube<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new LessonLookupError('YOUTUBE_API_KEY is not configured');

  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', key);

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    throw new LessonLookupError(data?.error?.message || `YouTube API error ${res.status}`);
  }
  return data.items || [];
}

// Bump when the search query or candidate sources change, so cached candidates are refetched
export const LESSON_SEARCH_VERSION = 2;

// [videoId, title] for every upload on a channel (playlistItems costs 1 quota unit per 50 videos)
export type ChannelUploads = [string, string][];

const MAX_UPLOAD_PAGES = 100;

export async function fetchChannelUploads(channelId: string): Promise<ChannelUploads> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new LessonLookupError('YOUTUBE_API_KEY is not configured');

  const uploads: ChannelUploads = [];
  let pageToken = '';
  for (let page = 0; page < MAX_UPLOAD_PAGES; page++) {
    const url = new URL(`${API}/playlistItems`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('playlistId', `UU${channelId.slice(2)}`); // The channel's uploads playlist
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', key);

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new LessonLookupError(data?.error?.message || `YouTube API error ${res.status}`);

    for (const item of (data.items || []) as PlaylistItem[]) {
      uploads.push([item.snippet.resourceId.videoId, item.snippet.title]);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return uploads;
}

const ARTIST_STOPWORDS = new Set(['the', 'and', 'band', 'his', 'her', 'their']);

// Find a song in a channel's uploads. Titles look like "Song - Artist - Guitar TABS Lesson".
export function matchChannelUploads(uploads: ChannelUploads, songTitle: string, artist: string): string[] {
  const song = normalize(songTitle.replace(/\(.*?\)/g, ''));
  const artistTokens = tokens(artist).filter((t) => !ARTIST_STOPWORDS.has(t));

  return uploads
    .filter(([, title]) => {
      const [uploadSong, uploadArtist = ''] = title.split(/\s+[-–—|]\s+/);
      if (normalize(uploadSong) !== song) return false;
      const uploadArtistTokens = tokens(uploadArtist);
      return artistTokens.some((t) => uploadArtistTokens.includes(t));
    })
    .map(([videoId]) => videoId)
    .slice(0, 3);
}

// Search YouTube for guitar solo lessons for a song. Raw candidates are cached
// (not rankings) so scoring can be tuned without spending more API quota.
export async function fetchLessonCandidates(
  songTitle: string,
  artist: string,
  extraVideoIds: string[] = []
): Promise<LessonCandidate[]> {
  const query = `${songTitle.replace(/\(.*?\)/g, '').trim()} ${artist} guitar solo lesson tabs`;

  // search.list costs 100 quota units; the follow-up lookups cost 1 each
  const results = await youtube<SearchItem>('search', {
    part: 'id',
    type: 'video',
    maxResults: '15',
    videoEmbeddable: 'true',
    q: query,
  });
  const ids = [...new Set([...extraVideoIds, ...results.map((r) => r.id.videoId)])].slice(0, 50);
  if (ids.length === 0) return [];

  const videos = await youtube<VideoItem>('videos', {
    part: 'snippet,statistics,contentDetails',
    id: ids.join(','),
  });

  const channelIds = [...new Set(videos.map((v) => v.snippet.channelId))];
  const channels = await youtube<ChannelItem>('channels', {
    part: 'statistics',
    id: channelIds.join(','),
  });
  const subscribers = new Map(
    channels.map((c) => [
      c.id,
      c.statistics.hiddenSubscriberCount ? null : Number(c.statistics.subscriberCount || 0),
    ])
  );

  return videos.map((v) => ({
    videoId: v.id,
    title: v.snippet.title,
    description: v.snippet.description.slice(0, 2000),
    tags: (v.snippet.tags || []).join(' ').slice(0, 500),
    channelId: v.snippet.channelId,
    channelTitle: v.snippet.channelTitle,
    viewCount: Number(v.statistics.viewCount || 0),
    subscriberCount: subscribers.get(v.snippet.channelId) ?? null,
    durationSec: parseDuration(v.contentDetails.duration),
  }));
}

// Rank candidates for a song, best first
export function rankLessonCandidates(
  candidates: LessonCandidate[],
  songTitle: string,
  artist: string
): LessonVideo[] {
  return candidates
    .map((c) => {
      const { score, hasTabs, hasSolo } = scoreCandidate(c, songTitle, artist);
      return {
        videoId: c.videoId,
        title: c.title,
        channelTitle: c.channelTitle,
        viewCount: c.viewCount,
        subscriberCount: c.subscriberCount,
        durationSec: c.durationSec,
        hasTabs,
        hasSolo,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
