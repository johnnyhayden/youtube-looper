import type { SetlistSong } from './types';

const PITCH_CLASSES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

// Spotify key + mode -> "A", "Am", etc.
export function formatKey(key: number | null, mode: number | null): string {
  if (key === null || key < 0 || key > 11) return '';
  return PITCH_CLASSES[key] + (mode === 0 ? 'm' : '');
}

export function formatDuration(ms: number | null): string {
  if (!ms) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Strip Spotify release suffixes like " - 2014 Remaster", " - Live", "(Remastered 2009)"
export function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s+-\s+.*\b(remaster(ed)?|live|version|edit|mix|mono|stereo|single|acoustic|demo)\b.*$/i, '')
    .replace(/\s*[([][^)\]]*\b(remaster(ed)?|feat\.?|ft\.?|with|live|version|edit|mix|mono|stereo)\b[^)\]]*[)\]]/gi, '')
    .trim();
}

// Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines in quotes)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Parse a playlist CSV exported from https://exportify.net
export function parseExportifyCsv(text: string): SetlistSong[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  if (!header) throw new Error('The CSV file is empty.');

  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const titleCol = col('Track Name');
  const artistCol = col('Artist Name(s)');
  if (titleCol === -1 || artistCol === -1) {
    throw new Error('This doesn\'t look like an Exportify CSV (missing "Track Name" or "Artist Name(s)" columns).');
  }
  const uriCol = col('Track URI');
  const albumCol = col('Album Name');
  const durationCol = col('Duration (ms)');
  const keyCol = col('Key');
  const modeCol = col('Mode');
  const tempoCol = col('Tempo');

  return rows
    .filter((r) => r[titleCol]?.trim())
    .map((r, i) => {
      const tempo = toNumber(r[tempoCol]);
      return {
        id: r[uriCol]?.trim() || `row-${i}`,
        title: cleanTrackTitle(r[titleCol].trim()),
        // Exportify joins multiple artists with ";"
        artist: r[artistCol].split(';')[0].trim(),
        album: r[albumCol]?.trim() || '',
        durationMs: toNumber(r[durationCol]),
        key: toNumber(r[keyCol]),
        mode: toNumber(r[modeCol]),
        tempo: tempo === null ? null : Math.round(tempo),
      };
    });
}
