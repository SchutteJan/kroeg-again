import { useEffect, useState } from 'react';
import { Header, Footer } from './components/layout';
import { TileGrid } from './components/grid';
import {
  ProgressPanel,
  GeneratingPanel,
  QueuePanel,
  TileDetailPanel,
  ErrorsPanel,
} from './components/sidebar';
import { useStore } from './store';
import { useSSE } from './hooks/useSSE';
import { fetchTiles, fetchProgress, fetchGenerationStatus } from './api/client';

export default function App() {
  const [overlay, setOverlay] = useState<string | null>('Loading tiles...');
  const { setTiles, setProgress, setStatus, centerView } = useStore();

  useSSE();

  useEffect(() => {
    async function load() {
      try {
        const [tiles, progress, status] = await Promise.all([
          fetchTiles(),
          fetchProgress(),
          fetchGenerationStatus(),
        ]);

        setTiles(tiles);
        setProgress(progress);
        setStatus(status);

        // Center view after loading
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          centerView(rect.width, rect.height);
        }

        setOverlay(null);
      } catch {
        setOverlay('Unable to load tiles.');
      }
    }

    load();
  }, [setTiles, setProgress, setStatus, centerView]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full-screen grid */}
      <TileGrid overlay={overlay} />

      {/* Overlaid header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="pointer-events-auto">
          <Header />
        </div>
      </div>

      {/* Overlaid sidebar */}
      <aside className="absolute top-20 right-4 bottom-16 w-80 flex flex-col gap-3 overflow-y-auto pointer-events-none max-lg:w-72 max-md:hidden">
        <div className="pointer-events-auto opacity-95">
          <ProgressPanel />
        </div>
        <div className="pointer-events-auto opacity-95">
          <GeneratingPanel />
        </div>
        <div className="pointer-events-auto opacity-95">
          <QueuePanel />
        </div>
        <div className="pointer-events-auto opacity-95">
          <TileDetailPanel />
        </div>
        <div className="pointer-events-auto opacity-95">
          <ErrorsPanel />
        </div>
      </aside>

      {/* Overlaid footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="pointer-events-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
