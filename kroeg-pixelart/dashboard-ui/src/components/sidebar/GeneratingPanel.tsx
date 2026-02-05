import { Panel } from '../layout/Panel';
import { useStore } from '../../store';

export function GeneratingPanel() {
  const { tiles } = useStore();

  const generating = Array.from(tiles.values())
    .filter((t) => t.status === 'generating')
    .slice(0, 6);

  return (
    <Panel title="Generating" compact>
      <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm text-muted">
        {generating.length === 0 ? (
          <li className="list-item">
            <span>No active tiles</span>
          </li>
        ) : (
          generating.map((tile) => (
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
