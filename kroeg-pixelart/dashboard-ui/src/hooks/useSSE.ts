import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { fetchTile } from '../api/client';
import type { TileUpdate } from '../types';

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const {
    setProgress,
    updateTile,
    addTile,
    addError,
    setLastUpdate,
    tiles,
  } = useStore();

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const source = new EventSource('/api/events');
      eventSourceRef.current = source;

      source.onmessage = async (event) => {
        if (!event.data) return;

        const update: TileUpdate = JSON.parse(event.data);
        setLastUpdate(new Date(update.timestamp));

        if (update.type === 'progress' && update.progress) {
          setProgress(update.progress);
          return;
        }

        if (update.type === 'tile_status' && update.tileId && update.status) {
          if (!tiles.has(update.tileId)) {
            const tile = await fetchTile(update.tileId);
            if (tile) {
              addTile(tile);
            }
          } else {
            updateTile(update.tileId, update.status, new Date(update.timestamp));
          }
        }

        if (update.type === 'error' && update.error) {
          addError(update.error);
        }
      };

      source.onerror = () => {
        source.close();
        reconnectTimeout = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSourceRef.current?.close();
    };
  }, [setProgress, updateTile, addTile, addError, setLastUpdate, tiles]);
}
