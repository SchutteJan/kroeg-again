import { useStore } from '../../store';
import type { TileStatus } from '../../types';

const STATUSES: TileStatus[] = ['pending', 'rendered', 'generating', 'complete', 'failed'];

export function GridControls() {
  const { filters, setFilter, zoom, setZoom, centerView } = useStore();

  const handleZoomIn = () => setZoom(zoom * 1.5);
  const handleZoomOut = () => setZoom(zoom / 1.5);
  const handleReset = () => {
    setZoom(1);
    // Get canvas dimensions for centering
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      centerView(rect.width, rect.height);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 text-sm text-muted">
        {STATUSES.map((status) => (
          <label key={status} className="inline-flex gap-2 items-center capitalize cursor-pointer">
            <input
              type="checkbox"
              checked={filters[status]}
              onChange={(e) => setFilter(status, e.target.checked)}
              className="cursor-pointer"
            />
            {status}
          </label>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <button className="btn btn-ghost px-3" onClick={handleZoomOut}>
          −
        </button>
        <span className="text-sm text-muted min-w-[4ch] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button className="btn btn-ghost px-3" onClick={handleZoomIn}>
          +
        </button>
        <button className="btn btn-ghost text-sm" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
