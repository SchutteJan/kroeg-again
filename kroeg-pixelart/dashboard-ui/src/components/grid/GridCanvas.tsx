import { useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';

interface GridCanvasProps {
  overlay?: string | null;
}

export function GridCanvas({ overlay }: GridCanvasProps) {
  const { canvasRef, resizeCanvas, handleMouseDown, handleClick } = useCanvas();

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  return (
    <div className="absolute inset-0 bg-[#faf4ea]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center font-semibold text-muted backdrop-blur-sm bg-white/60">
          {overlay}
        </div>
      )}
    </div>
  );
}
