'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { PlayerState, LoopState, Preset } from './types';
import { clampSpeed, speedToYouTube, MIN_SPEED, MAX_SPEED, SPEED_STEP } from './youtube';

// YouTube Player type (from IFrame API)
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
}

type Action =
  | { type: 'SET_VIDEO_ID'; payload: string | null }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_LOOP_START'; payload: number | null }
  | { type: 'SET_LOOP_END'; payload: number | null }
  | { type: 'SET_LOOP_ENABLED'; payload: boolean }
  | { type: 'LOAD_PRESET'; payload: Preset }
  | { type: 'RESET' };

const initialState: PlayerState = {
  videoId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  speed: 100,
  loop: {
    start: null,
    end: null,
    enabled: false,
  },
};

function playerReducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'SET_VIDEO_ID':
      return { ...initialState, videoId: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_SPEED':
      return { ...state, speed: clampSpeed(action.payload) };
    case 'SET_LOOP_START':
      return { ...state, loop: { ...state.loop, start: action.payload } };
    case 'SET_LOOP_END':
      return { ...state, loop: { ...state.loop, end: action.payload } };
    case 'SET_LOOP_ENABLED':
      return { ...state, loop: { ...state.loop, enabled: action.payload } };
    case 'LOAD_PRESET':
      return {
        ...state,
        speed: action.payload.speed,
        loop: {
          start: action.payload.start,
          end: action.payload.end,
          enabled: true,
        },
      };
    case 'RESET':
      return {
        ...state,
        speed: 100,
        loop: { start: null, end: null, enabled: false },
      };
    default:
      return state;
  }
}

interface PlayerContextType {
  state: PlayerState;
  playerRef: React.MutableRefObject<YTPlayer | null>;
  setVideoId: (id: string | null) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setSpeed: (speed: number) => void;
  adjustSpeed: (delta: number) => void;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  setLoopStartAtCurrent: () => void;
  setLoopEndAtCurrent: () => void;
  toggleLoop: () => void;
  loadPreset: (preset: Preset) => void;
  reset: () => void;
  updateTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  updatePlaying: (playing: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const playerRef = useRef<YTPlayer | null>(null);
  const loopCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setVideoId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_VIDEO_ID', payload: id });
  }, []);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
  }, []);

  const seekRelative = useCallback((delta: number) => {
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + delta));
    seek(newTime);
  }, [state.currentTime, state.duration, seek]);

  const setSpeed = useCallback((speed: number) => {
    const clampedSpeed = clampSpeed(speed);
    dispatch({ type: 'SET_SPEED', payload: clampedSpeed });
    playerRef.current?.setPlaybackRate(speedToYouTube(clampedSpeed));
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    setSpeed(state.speed + delta);
  }, [state.speed, setSpeed]);

  const setLoopStart = useCallback((time: number | null) => {
    dispatch({ type: 'SET_LOOP_START', payload: time });
  }, []);

  const setLoopEnd = useCallback((time: number | null) => {
    dispatch({ type: 'SET_LOOP_END', payload: time });
  }, []);

  const setLoopStartAtCurrent = useCallback(() => {
    dispatch({ type: 'SET_LOOP_START', payload: state.currentTime });
  }, [state.currentTime]);

  const setLoopEndAtCurrent = useCallback(() => {
    dispatch({ type: 'SET_LOOP_END', payload: state.currentTime });
  }, [state.currentTime]);

  const toggleLoop = useCallback(() => {
    dispatch({ type: 'SET_LOOP_ENABLED', payload: !state.loop.enabled });
  }, [state.loop.enabled]);

  const loadPreset = useCallback((preset: Preset) => {
    dispatch({ type: 'LOAD_PRESET', payload: preset });
    playerRef.current?.setPlaybackRate(speedToYouTube(preset.speed));
    playerRef.current?.seekTo(preset.start, true);
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    playerRef.current?.setPlaybackRate(1);
    playerRef.current?.seekTo(0, true);
  }, []);

  const updateTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, []);

  const updateDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
  }, []);

  const updatePlaying = useCallback((playing: boolean) => {
    dispatch({ type: 'SET_PLAYING', payload: playing });
  }, []);

  // Loop enforcement
  useEffect(() => {
    if (loopCheckIntervalRef.current) {
      clearInterval(loopCheckIntervalRef.current);
    }

    if (state.loop.enabled && state.loop.start !== null && state.loop.end !== null && state.isPlaying) {
      loopCheckIntervalRef.current = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() ?? 0;
        if (currentTime >= state.loop.end!) {
          playerRef.current?.seekTo(state.loop.start!, true);
        }
      }, 100);
    }

    return () => {
      if (loopCheckIntervalRef.current) {
        clearInterval(loopCheckIntervalRef.current);
      }
    };
  }, [state.loop.enabled, state.loop.start, state.loop.end, state.isPlaying]);

  return (
    <PlayerContext.Provider
      value={{
        state,
        playerRef,
        setVideoId,
        play,
        pause,
        togglePlayPause,
        seek,
        seekRelative,
        setSpeed,
        adjustSpeed,
        setLoopStart,
        setLoopEnd,
        setLoopStartAtCurrent,
        setLoopEndAtCurrent,
        toggleLoop,
        loadPreset,
        reset,
        updateTime,
        updateDuration,
        updatePlaying,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

