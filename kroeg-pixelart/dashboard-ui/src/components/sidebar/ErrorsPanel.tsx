import { Panel } from '../layout/Panel';
import { useStore } from '../../store';

export function ErrorsPanel() {
  const { errors } = useStore();

  return (
    <Panel title="Recent Errors" compact>
      <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm text-muted">
        {errors.length === 0 ? (
          <li className="list-item">
            <span>No recent errors</span>
          </li>
        ) : (
          errors.map((error, index) => (
            <li key={`${error.tileId}-${index}`} className="list-item">
              <strong>{error.tileId}</strong>
              <span className="truncate">{error.message}</span>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
