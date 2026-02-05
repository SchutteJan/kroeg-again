import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { STATUS_COLORS, type Tile } from '../types';
import { getTileImageUrl } from '../api/client';

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTileImageType(tile: Tile): 'output' | 'render' | null {
  if (tile.status === 'complete' && tile.outputPath) return 'output';
  // Show render for rendered, complete, or failed tiles (if render exists)
  if (tile.renderPath) return 'render';
  return null;
}

// Global image cache to persist across re-renders
const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Set<string>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRequestRef = useRef<number | null>(null);
  const {
    tiles,
    bounds,
    selectedId,
    filters,
    zoom,
    panX,
    panY,
    tileSize,
    isDragging,
    dragStart,
    panStart,
    setZoom,
    setPan,
    setDragging,
    setSelectedId,
    centerView,
  } = useStore();

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(90, 83, 74, 0.12)';
    ctx.lineWidth = 1 / zoom;

    for (let x = 0; x <= width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, height * tileSize);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(width * tileSize, y * tileSize);
      ctx.stroke();
    }

    // Draw tiles
    for (const tile of tiles.values()) {
      const offsetX = (tile.coord.x - bounds.minX) * tileSize;
      const offsetY = (tile.coord.y - bounds.minY) * tileSize;
      const status = tile.status;
      const isVisible = filters[status] === true;

      // Check if we have an image for this tile
      // Include updatedAt in cache key to invalidate on re-render
      const imageType = getTileImageType(tile);
      const cacheKey = imageType ? `${tile.id}-${imageType}-${tile.updatedAt.getTime()}` : null;
      const cachedImage = cacheKey ? imageCache.get(cacheKey) : null;

      const gap = 0;
      const drawSize = tileSize - gap;

      if (cachedImage && isVisible) {
        // Draw the tile image
        ctx.drawImage(cachedImage, offsetX, offsetY, drawSize, drawSize);
      } else {
        // Draw colored rectangle as fallback
        const alpha = isVisible ? 0.95 : 0.12;
        ctx.fillStyle = withAlpha(STATUS_COLORS[status], alpha);
        ctx.fillRect(offsetX, offsetY, drawSize, drawSize);
      }

      // Load image if needed (async, will trigger re-render when loaded)
      if (imageType && cacheKey && !cachedImage && !loadingImages.has(cacheKey)) {
        loadingImages.add(cacheKey);
        const url = getTileImageUrl(tile.id, imageType);
        const tilePrefix = `${tile.id}-${imageType}-`;
        loadImage(url)
          .then((img) => {
            // Remove old cache entries for this tile
            for (const key of imageCache.keys()) {
              if (key.startsWith(tilePrefix) && key !== cacheKey) {
                imageCache.delete(key);
              }
            }
            imageCache.set(cacheKey, img);
            loadingImages.delete(cacheKey);
            // Schedule a re-render
            if (renderRequestRef.current) {
              cancelAnimationFrame(renderRequestRef.current);
            }
            renderRequestRef.current = requestAnimationFrame(() => {
              render();
            });
          })
          .catch(() => {
            loadingImages.delete(cacheKey);
          });
      }
    }

    // Draw selection
    if (selectedId && tiles.has(selectedId)) {
      const tile = tiles.get(selectedId)!;
      const offsetX = (tile.coord.x - bounds.minX) * tileSize;
      const offsetY = (tile.coord.y - bounds.minY) * tileSize;
      ctx.strokeStyle = '#1f6f6b';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(offsetX, offsetY, tileSize, tileSize);
    }

    ctx.restore();
  }, [tiles, bounds, selectedId, filters, zoom, panX, panY, tileSize]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    render();
  }, [render]);

  const getTileFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;

      const tileX = Math.floor(x / tileSize) + bounds.minX;
      const tileY = Math.floor(y / tileSize) + bounds.minY;

      const id = `tile_${tileX}_${tileY}`;
      return tiles.get(id) ?? null;
    },
    [panX, panY, zoom, tileSize, bounds, tiles]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDragging(true, e.clientX, e.clientY);
    },
    [setDragging]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newPanX = panStart.x + (e.clientX - dragStart.x);
      const newPanY = panStart.y + (e.clientY - dragStart.y);
      setPan(newPanX, newPanY);
    },
    [isDragging, panStart, dragStart, setPan]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, [setDragging]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const tile = getTileFromPoint(e.clientX, e.clientY);
      if (tile) {
        setSelectedId(tile.id);
      }
    },
    [getTileFromPoint, setSelectedId]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(Math.max(zoom * zoomDelta, 0.1), 50);

      const worldX = (mouseX - panX) / zoom;
      const worldY = (mouseY - panY) / zoom;

      setZoom(nextZoom);
      setPan(mouseX - worldX * nextZoom, mouseY - worldY * nextZoom);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    resizeCanvas,
    render,
    handleMouseDown,
    handleClick,
    centerView,
    setZoom,
    zoom,
  };
}
