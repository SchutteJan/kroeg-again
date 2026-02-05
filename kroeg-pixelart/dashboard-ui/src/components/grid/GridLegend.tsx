import { STATUS_COLORS, type TileStatus } from '../../types';

const LEGEND_ITEMS: { status: TileStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'rendered', label: 'Rendered' },
  { status: 'generating', label: 'Generating' },
  { status: 'complete', label: 'Complete' },
  { status: 'failed', label: 'Failed' },
];

export function GridLegend() {
  return (
    <div className="flex gap-4 flex-wrap text-sm text-muted">
      {LEGEND_ITEMS.map(({ status, label }) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
