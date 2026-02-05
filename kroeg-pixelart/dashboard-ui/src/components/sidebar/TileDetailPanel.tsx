import { useState } from 'react';
import { Panel } from '../layout/Panel';
import { useStore } from '../../store';
import { renderTile, generateTile, fetchTile, getTileImageUrl } from '../../api/client';
import { STATUS_LABELS } from '../../types';

export function TileDetailPanel() {
  const { tiles, selectedId, addTile, addError, status } = useStore();
  const [isRendering, setIsRendering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const tile = selectedId ? tiles.get(selectedId) : null;

  // Allow rendering any tile except one currently generating
  const canRender = tile && tile.status !== 'generating' && !isGenerating;
  // Allow generating rendered, complete, or failed tiles (not pending or currently generating)
  const canGenerate =
    tile &&
    (tile.status === 'rendered' || tile.status === 'complete' || tile.status === 'failed') &&
    status.status === 'idle' &&
    !isRendering;

  const handleRender = async () => {
    if (!tile) return;
    setIsRendering(true);
    try {
      await renderTile(tile.id);
      const updated = await fetchTile(tile.id);
      if (updated) {
        addTile(updated);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Render request failed';
      console.error(`Render failed for ${tile.id}:`, err);
      addError({ tileId: tile.id, message });
    } finally {
      setIsRendering(false);
    }
  };

  const handleGenerate = async () => {
    if (!tile) return;
    setIsGenerating(true);
    try {
      await generateTile(tile.id);
      const updated = await fetchTile(tile.id);
      if (updated) {
        addTile(updated);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generate request failed';
      console.error(`Generate failed for ${tile.id}:`, err);
      addError({ tileId: tile.id, message });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasOutput = tile?.status === 'complete' && tile.outputPath;
  const hasRender = tile?.renderPath;
  const imageUrl = hasOutput
    ? getTileImageUrl(tile!.id, 'output')
    : hasRender
      ? getTileImageUrl(tile!.id, 'render')
      : null;

  return (
    <Panel title="Tile Details" compact>
      {!tile ? (
        <p className="text-sm text-muted mt-1.5">Click a tile to see metadata.</p>
      ) : (
        <>
          <div className="text-sm text-muted grid gap-2">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ink">Tile</span>
              <span>{tile.id}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ink">Status</span>
              <span>{STATUS_LABELS[tile.status]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ink">Bounds</span>
              <span>
                {tile.bounds.north.toFixed(4)}, {tile.bounds.west.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ink">Updated</span>
              <span>{tile.updatedAt.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-bg-accent rounded-xl border border-[#eadbc8] overflow-hidden aspect-square flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Preview for ${tile.id}`}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span className="text-muted text-sm">No image available</span>
            )}
          </div>

          <div className="flex gap-2 mt-1">
            <button
              className="btn flex-1"
              onClick={handleRender}
              disabled={!canRender || isRendering}
            >
              {isRendering ? 'Rendering...' : 'Render'}
            </button>
            <button
              className="btn flex-1"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
