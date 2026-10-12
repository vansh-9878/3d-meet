import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Trash2,
  Eraser,
  PenTool,
  Check,
  Palette,
  Minus
} from 'lucide-react';

const COLORS = [
  { name: 'Black', hex: '#0f172a' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Orange', hex: '#ea580c' }
];

const BRUSH_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 7 },
  { label: 'Broad', size: 14 },
  { label: 'Marker', size: 26 }
];

export function WhiteboardModal({
  isOpen = false,
  onClose = () => {},
  onDraw = () => {},
  strokes = []
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [currentColor, setCurrentColor] = useState(COLORS[0].hex);
  const [currentSize, setCurrentSize] = useState(BRUSH_SIZES[1].size);
  const [isEraser, setIsEraser] = useState(false);

  // Redraw canvas with full stroke history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill background with clean white and subtle grid
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 60; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 60; y < canvas.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    strokes.forEach((s) => {
      if (s.isClear) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.strokeStyle = s.isEraser ? '#ffffff' : (s.color || '#0f172a');
      ctx.lineWidth = s.size || 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  }, [strokes]);

  useEffect(() => {
    if (isOpen) {
      redrawCanvas();
    }
  }, [isOpen, redrawCanvas]);

  // Convert client viewport coordinates to internal 1920x960 canvas coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    isDrawingRef.current = true;
    lastPointRef.current = getCoordinates(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const currentPoint = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const strokeData = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: currentPoint.x,
      y1: currentPoint.y,
      color: currentColor,
      size: currentSize,
      isEraser
    };

    // Draw locally for instantaneous zero-latency feedback
    ctx.beginPath();
    ctx.moveTo(strokeData.x0, strokeData.y0);
    ctx.lineTo(strokeData.x1, strokeData.y1);
    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Broadcast stroke to everyone in the room
    onDraw(strokeData);

    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearBoard = () => {
    if (window.confirm('Clear all drawings on the whiteboard for everyone?')) {
      const clearData = { isClear: true };
      onDraw(clearData);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-6xl bg-white border border-gray-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                Collaborative Whiteboard
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live in 3D Room
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Only you can draw right now. Click "Exit & Release" when finished so others can draw.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Clear Board Button */}
            <button
              onClick={handleClearBoard}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition-all active:scale-95"
              title="Clear all drawings"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Board</span>
            </button>

            {/* Exit and release whiteboard button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
              title="Release whiteboard control and exit"
            >
              <Check className="w-4 h-4" />
              <span>Done (Release Board)</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Color Palette, Brush Thickness, Eraser */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-white border-b border-gray-200">
          {/* Color Swatches */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Colors:
            </span>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => {
                    setCurrentColor(c.hex);
                    setIsEraser(false);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                    !isEraser && currentColor === c.hex
                      ? 'border-blue-600 ring-2 ring-blue-300 scale-110'
                      : 'border-white shadow'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Brush Thickness & Eraser */}
          <div className="flex items-center gap-4">
            {/* Brush Sizes */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  onClick={() => setCurrentSize(b.size)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    currentSize === b.size
                      ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Eraser Tool */}
            <button
              onClick={() => setIsEraser((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isEraser
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
              title="Eraser tool"
            >
              <Eraser className="w-4 h-4" />
              <span>Eraser</span>
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="relative flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1920}
            height={960}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-auto max-h-[70vh] bg-white rounded-2xl shadow-xl border border-gray-300 cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
}
