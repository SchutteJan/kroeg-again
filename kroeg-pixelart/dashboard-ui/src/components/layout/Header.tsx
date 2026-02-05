import { useStore } from '../../store';
import { startGeneration, pauseGeneration, retryTile } from '../../api/client';

export function Header() {
  const { status, setStatus, addError, tiles } = useStore();

  const isRunning = status.status === 'running';
  const isStopping = status.status === 'stopping';
  const hasFailed = Array.from(tiles.values()).some((t) => t.status === 'failed');

  const handleStart = async () => {
    try {
      const newStatus = await startGeneration();
      setStatus(newStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start';
      console.error('Generation start failed:', err);
      addError({ tileId: 'generation', message });
    }
  };

  const handlePause = async () => {
    try {
      const newStatus = await pauseGeneration();
      setStatus(newStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause';
      console.error('Generation pause failed:', err);
      addError({ tileId: 'generation', message });
    }
  };

  const handleRetry = async () => {
    const failed = Array.from(tiles.values()).find((t) => t.status === 'failed');
    if (!failed) return;
    try {
      const newStatus = await retryTile(failed.id);
      setStatus(newStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry';
      console.error(`Retry failed for ${failed.id}:`, err);
      addError({ tileId: failed.id, message });
    }
  };

  return (
    <header className="flex justify-between items-center gap-6 flex-wrap bg-panel/90 backdrop-blur-sm rounded-panel p-4 border border-panel-border shadow-panel">
      <div>
        <p className="uppercase text-xs tracking-[0.24em] m-0 text-muted">Kroeg Pipeline</p>
        <h1 className="font-serif text-[clamp(24px,2.5vw,36px)] m-0 mt-1 tracking-[0.5px]">
          Pixel Art Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-4 flex-wrap justify-end">
        <span
          className={`font-semibold py-2 px-3.5 rounded-full border ${
            isRunning || isStopping
              ? 'bg-[#f9e2cc] text-[#9a5625] border-[#efc49c]'
              : 'bg-[#e4f1ec] text-accent border-[#cbe3d8]'
          }`}
        >
          {isStopping ? 'Stopping' : isRunning ? 'Running' : 'Idle'}
        </span>
        <div className="flex gap-2.5">
          <button
            className="btn"
            onClick={handleStart}
            disabled={isRunning || isStopping}
          >
            Start
          </button>
          <button
            className="btn"
            onClick={handlePause}
            disabled={!isRunning}
          >
            Pause
          </button>
          <button
            className="btn"
            onClick={handleRetry}
            disabled={isRunning || isStopping || !hasFailed}
          >
            Retry
          </button>
        </div>
      </div>
    </header>
  );
}
