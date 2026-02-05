import { Panel } from '../layout/Panel';
import { useStore } from '../../store';

function formatRate(rate: number): string {
  if (!rate || rate <= 0) return 'n/a';
  return `${rate.toFixed(1)}/hr`;
}

function formatEta(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return 'n/a';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  wide?: boolean;
}

function StatCard({ label, value, wide }: StatCardProps) {
  return (
    <div className={`stat-card ${wide ? 'col-span-2 max-md:col-span-1' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

export function ProgressPanel() {
  const { progress } = useStore();

  return (
    <Panel title="Progress">
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <StatCard label="Total" value={progress.total} />
        <StatCard label="Complete" value={progress.complete} />
        <StatCard label="Pending" value={progress.pending} />
        <StatCard label="Rendered" value={progress.rendered} />
        <StatCard label="Generating" value={progress.generating} />
        <StatCard label="Failed" value={progress.failed} />
        <StatCard label="Rate" value={formatRate(progress.ratePerHour)} />
        <StatCard label="ETA" value={formatEta(progress.etaMinutes)} />
      </div>
    </Panel>
  );
}
