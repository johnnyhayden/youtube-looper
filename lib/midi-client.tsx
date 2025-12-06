'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { MidiAction, MidiConfig } from './types';
import { SPEED_STEP, MIN_SPEED, MAX_SPEED } from './youtube';

const MIDI_BRIDGE_URL = 'ws://localhost:3001';
const RECONNECT_DELAY = 3000;

interface MidiMessage {
  type: 'midi' | 'config';
  action?: MidiAction;
  controller?: number;
  value?: number;
  channel?: number;
  config?: MidiConfig;
}

interface MidiHandlers {
  onPlayPause: () => void;
  onToggleLoop: () => void;
  onNextPreset: () => void;
  onPrevPreset: () => void;
  onSpeedDown: () => void;
  onSpeedUp: () => void;
  onSetSpeed: (speed: number) => void;
}

export function useMidiBridge(handlers: MidiHandlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<MidiConfig | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(MIDI_BRIDGE_URL);

      ws.onopen = () => {
        console.log('🎹 Connected to MIDI bridge');
        setIsConnected(true);
      };

      ws.onclose = () => {
        console.log('🎹 Disconnected from MIDI bridge');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = (error) => {
        console.log('🎹 MIDI bridge connection error (bridge may not be running)');
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const message: MidiMessage = JSON.parse(event.data);

          if (message.type === 'config') {
            setConfig(message.config || null);
            return;
          }

          if (message.type === 'midi' && message.action) {
            const h = handlersRef.current;

            switch (message.action) {
              case 'play_pause':
                h.onPlayPause();
                break;
              case 'toggle_loop':
                h.onToggleLoop();
                break;
              case 'next_preset':
                h.onNextPreset();
                break;
              case 'prev_preset':
                h.onPrevPreset();
                break;
              case 'speed_down':
                h.onSpeedDown();
                break;
              case 'speed_up':
                h.onSpeedUp();
                break;
              case 'set_speed':
                // Map MIDI value (0-127) to speed (25-200)
                if (message.value !== undefined) {
                  const speed = Math.round(
                    MIN_SPEED + (message.value / 127) * (MAX_SPEED - MIN_SPEED)
                  );
                  // Round to nearest SPEED_STEP
                  const roundedSpeed = Math.round(speed / SPEED_STEP) * SPEED_STEP;
                  h.onSetSpeed(roundedSpeed);
                }
                break;
            }
          }
        } catch (err) {
          console.error('Error parsing MIDI message:', err);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to MIDI bridge:', err);
      setIsConnected(false);

      // Retry connection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { isConnected, config, reconnect: connect };
}

// Status indicator component
export function MidiStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
        }`}
      />
      <span className="text-muted-foreground">
        MIDI {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

