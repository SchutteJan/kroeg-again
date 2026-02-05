import { Panel } from '../layout/Panel';
import { useStore } from '../../store';

export function QueuePanel() {
  const { tiles } = useStore();

  const pending = Array.from(tiles.values())
    .filter((t) => t.status === 'pending')
    .sort((a, b) => a.coord.y - b.coord.y || a.coord.x - b.coord.x)
    .slice(0, 8);

  return (
    <Panel title="Queue" compact>
      <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm text-muted">
        {pending.length === 0 ? (
          <li className="list-item">
            <span>Queue is clear</span>
          </li>
        ) : (
          pending.map((tile) => (
            <li key={tile.id} className="list-item">
              <strong>{tile.id}</strong>
              <span>
                {tile.coord.x}, {tile.coord.y}
              </span>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
