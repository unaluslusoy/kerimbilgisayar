import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface PatternLockPickerProps {
  value: string; // "1-5-9-3" formatında
  onChange: (pattern: string) => void;
  size?: number;
  readOnly?: boolean;
}

// 3x3 grid: node 1=sol-üst...9=sağ-alt
const NODE_POSITIONS = [
  { id: 1, col: 0, row: 0 },
  { id: 2, col: 1, row: 0 },
  { id: 3, col: 2, row: 0 },
  { id: 4, col: 0, row: 1 },
  { id: 5, col: 1, row: 1 },
  { id: 6, col: 2, row: 1 },
  { id: 7, col: 0, row: 2 },
  { id: 8, col: 1, row: 2 },
  { id: 9, col: 2, row: 2 },
];

const PAD = 36;
const GRID = 3;

function getNodeCenter(node: { col: number; row: number }, svgSize: number) {
  const step = (svgSize - PAD * 2) / (GRID - 1);
  return {
    x: PAD + node.col * step,
    y: PAD + node.row * step,
  };
}

function parsePattern(val: string): number[] {
  if (!val) return [];
  return val.split('-').map(Number).filter(n => n >= 1 && n <= 9);
}

export default function PatternLockPicker({ value, onChange, size = 196, readOnly = false }: PatternLockPickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const selectedNodes = parsePattern(value);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [size]);

  const getHitNode = useCallback((x: number, y: number) => {
    const step = (size - PAD * 2) / (GRID - 1);
    const hitRadius = step * 0.38;
    for (const node of NODE_POSITIONS) {
      const cx = PAD + node.col * step;
      const cy = PAD + node.row * step;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) return node.id;
    }
    return null;
  }, [size]);

  const addNode = useCallback((id: number) => {
    if (selectedNodes.includes(id)) return;
    const next = [...selectedNodes, id];
    onChange(next.join('-'));
  }, [selectedNodes, onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const pt = getSVGPoint(e.clientX, e.clientY);
    if (!pt) return;
    setDrawing(true);
    const hit = getHitNode(pt.x, pt.y);
    if (hit) addNode(hit);
    setCurrentPos(pt);
  }, [readOnly, getSVGPoint, getHitNode, addNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || readOnly) return;
    const pt = getSVGPoint(e.clientX, e.clientY);
    if (!pt) return;
    setCurrentPos(pt);
    const hit = getHitNode(pt.x, pt.y);
    if (hit) addNode(hit);
  }, [drawing, readOnly, getSVGPoint, getHitNode, addNode]);

  const handleMouseUp = useCallback(() => {
    setDrawing(false);
    setCurrentPos(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const t = e.touches[0];
    const pt = getSVGPoint(t.clientX, t.clientY);
    if (!pt) return;
    setDrawing(true);
    const hit = getHitNode(pt.x, pt.y);
    if (hit) addNode(hit);
    setCurrentPos(pt);
  }, [readOnly, getSVGPoint, getHitNode, addNode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drawing || readOnly) return;
    e.preventDefault();
    const t = e.touches[0];
    const pt = getSVGPoint(t.clientX, t.clientY);
    if (!pt) return;
    setCurrentPos(pt);
    const hit = getHitNode(pt.x, pt.y);
    if (hit) addNode(hit);
  }, [drawing, readOnly, getSVGPoint, getHitNode, addNode]);

  useEffect(() => {
    const up = () => { setDrawing(false); setCurrentPos(null); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const step = (size - PAD * 2) / (GRID - 1);
  const nodeR = step * 0.20;
  const innerR = nodeR * 0.48;

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < selectedNodes.length - 1; i++) {
    const a = NODE_POSITIONS.find(n => n.id === selectedNodes[i])!;
    const b = NODE_POSITIONS.find(n => n.id === selectedNodes[i + 1])!;
    const ca = getNodeCenter(a, size);
    const cb = getNodeCenter(b, size);
    lines.push({ x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y });
  }

  let trailLine = null;
  if (drawing && currentPos && selectedNodes.length > 0) {
    const last = NODE_POSITIONS.find(n => n.id === selectedNodes[selectedNodes.length - 1])!;
    const cl = getNodeCenter(last, size);
    trailLine = { x1: cl.x, y1: cl.y, x2: currentPos.x, y2: currentPos.y };
  }

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div style={{ touchAction: 'none' }}>
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rounded-2xl shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', userSelect: 'none', touchAction: 'none', cursor: readOnly ? 'default' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Bağlantı çizgileri */}
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#3b82f6"
              strokeWidth={nodeR * 0.52}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
          {trailLine && (
            <line
              x1={trailLine.x1} y1={trailLine.y1} x2={trailLine.x2} y2={trailLine.y2}
              stroke="#93c5fd"
              strokeWidth={nodeR * 0.38}
              strokeLinecap="round"
              strokeDasharray="5 4"
              opacity={0.55}
            />
          )}

          {/* Düğümler */}
          {NODE_POSITIONS.map(node => {
            const { x, y } = getNodeCenter(node, size);
            const isSelected = selectedNodes.includes(node.id);
            const order = selectedNodes.indexOf(node.id);
            return (
              <g key={node.id}>
                {/* Dış halka - seçili glow */}
                {isSelected && (
                  <circle
                    cx={x} cy={y} r={nodeR * 1.55}
                    fill="rgba(59,130,246,0.12)"
                  />
                )}
                {/* Ana halka */}
                <circle
                  cx={x} cy={y} r={nodeR}
                  fill={isSelected ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.07)'}
                  stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.28)'}
                  strokeWidth={isSelected ? 1.8 : 1.2}
                />
                {/* İç nokta */}
                <circle
                  cx={x} cy={y} r={innerR}
                  fill={isSelected ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                />
                {/* Sıra numarası */}
                {isSelected && (
                  <text
                    x={x + nodeR * 1.3}
                    y={y - nodeR * 1.1}
                    textAnchor="middle"
                    fontSize={nodeR * 0.78}
                    fill="#93c5fd"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {order + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Alt bilgi + temizle butonu */}
      <div className="flex items-center justify-between w-full px-0.5" style={{ width: size }}>
        <div className="flex-1 min-w-0">
          {selectedNodes.length > 0 ? (
            <p className="text-xs font-mono text-gray-500 truncate">
              <span className="text-gray-400">Desen: </span>
              <span className="font-bold text-gray-700 tracking-wider">{selectedNodes.join('-')}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">
              {readOnly ? '—' : 'Sürükleyerek desen çizin'}
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={selectedNodes.length === 0}
            className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-semibold disabled:opacity-30 shrink-0 ml-2"
            title="Deseni temizle"
          >
            <RotateCcw className="w-3 h-3" />
            Temizle
          </button>
        )}
      </div>
    </div>
  );
}
