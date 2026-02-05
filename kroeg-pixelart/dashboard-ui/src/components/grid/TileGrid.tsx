import { GridCanvas } from './GridCanvas';
import { GridControls } from './GridControls';
import { GridLegend } from './GridLegend';

interface TileGridProps {
  overlay?: string | null;
}

export function TileGrid({ overlay }: TileGridProps) {
  return (
    <div className="absolute inset-0">
      <GridCanvas overlay={overlay} />

      {/* Overlaid controls - bottom left */}
      <div className="absolute bottom-16 left-4 pointer-events-none">
        <div className="pointer-events-auto bg-panel/90 backdrop-blur-sm rounded-panel p-3 border border-panel-border shadow-panel">
          <GridControls />
        </div>
      </div>

      {/* Overlaid legend - bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="pointer-events-auto bg-panel/90 backdrop-blur-sm rounded-full px-4 py-2 border border-panel-border shadow-panel">
          <GridLegend />
        </div>
      </div>
    </div>
  );
}
