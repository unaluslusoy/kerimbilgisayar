import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignatureCanvasProps {
  value?: string;
  onChange?: (dataUrl: string) => void;
  label?: string;
  readOnly?: boolean;
}

export default function SignatureCanvas({
  value,
  onChange,
  label = 'Müşteri Dijital İmzası',
  readOnly = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasSignature(true);
        };
        img.src = value;
      }
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    if (canvasRef.current && onChange) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSignature(false);
    onChange?.('');
  };

  return (
    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-500" />
          {label}
        </label>
        {!readOnly && hasSignature && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" /> İmzayı Temizle
          </button>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={140}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-32 touch-none ${!readOnly ? 'cursor-crosshair' : 'cursor-default'}`}
        />
        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs gap-1.5">
            <span>İmzanızı bu alana çizin</span>
          </div>
        )}
      </div>
    </div>
  );
}
