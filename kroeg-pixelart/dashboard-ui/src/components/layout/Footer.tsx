import { useStore } from '../../store';

export function Footer() {
  const { lastUpdate } = useStore();

  return (
    <footer className="inline-flex gap-4 items-center text-sm text-muted bg-panel/90 backdrop-blur-sm rounded-full px-4 py-2 border border-panel-border">
      <span>Kroeg Pixel Art Pipeline</span>
      <span>•</span>
      <span>
        Last update:{' '}
        {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
      </span>
    </footer>
  );
}
