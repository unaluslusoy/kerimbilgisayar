import React, { useState } from 'react';
import { X, Plus, RotateCcw, AlertTriangle } from 'lucide-react';

export interface DamagePin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  type: 'cizik' | 'kirik' | 'ezik' | 'sivi' | 'diger';
  note?: string;
}

interface DamageMarkingCanvasProps {
  deviceType?: string;
  value?: DamagePin[];
  onChange?: (pins: DamagePin[]) => void;
  readOnly?: boolean;
}

const PIN_TYPES: { type: DamagePin['type']; label: string; color: string; bg: string }[] = [
  { type: 'cizik', label: 'Çizik / Deforme', color: '#f59e0b', bg: 'bg-amber-500' },
  { type: 'kirik', label: 'Kırık / Çatlak', color: '#ef4444', bg: 'bg-red-500' },
  { type: 'ezik', label: 'Ezik / Göçük', color: '#8b5cf6', bg: 'bg-purple-500' },
  { type: 'sivi', label: 'Sıvı Teması İzi', color: '#06b6d4', bg: 'bg-cyan-500' },
  { type: 'diger', label: 'Diğer Hasar', color: '#64748b', bg: 'bg-slate-500' },
];

export default function DamageMarkingCanvas({
  deviceType = 'telefon',
  value = [],
  onChange,
  readOnly = false,
}: DamageMarkingCanvasProps) {
  const [selectedType, setSelectedType] = useState<DamagePin['type']>('cizik');
  const [activePin, setActivePin] = useState<DamagePin | null>(null);

  const isLaptop = deviceType.toLowerCase().includes('laptop') || deviceType.toLowerCase().includes('bilgisayar') || deviceType.toLowerCase().includes('dizüstü');

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newPin: DamagePin = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      type: selectedType,
      note: '',
    };

    const updated = [...value, newPin];
    onChange?.(updated);
    setActivePin(newPin);
  };

  const removePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const updated = value.filter(p => p.id !== id);
    onChange?.(updated);
    if (activePin?.id === id) setActivePin(null);
  };

  const clearAll = () => {
    if (readOnly) return;
    onChange?.([]);
    setActivePin(null);
  };

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Fiziksel Hasar Haritası ({value.length} Nokta)
          </span>
        </div>
        {!readOnly && value.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition"
          >
            <RotateCcw className="w-3 h-3" /> Temizle
          </button>
        )}
      </div>

      {/* Pin Türü Seçici */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1.5">
          {PIN_TYPES.map(pt => (
            <button
              key={pt.type}
              type="button"
              onClick={() => setSelectedType(pt.type)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                selectedType === pt.type
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${pt.bg}`} />
              {pt.label}
            </button>
          ))}
        </div>
      )}

      {/* Cihaz Vektör Şeması */}
      <div
        onClick={handleCanvasClick}
        className={`relative w-full max-w-md mx-auto aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center select-none overflow-hidden ${
          !readOnly ? 'cursor-crosshair hover:border-blue-400' : ''
        }`}
      >
        {!isLaptop ? (
          /* Telefon Ön / Arka Vektör Şeması */
          <svg viewBox="0 0 400 300" className="w-full h-full p-4 text-slate-300 dark:text-slate-700 fill-none stroke-current stroke-2">
            {/* Telefon 1: Ön Yüz */}
            <g transform="translate(40, 20)">
              <rect x="0" y="0" width="130" height="250" rx="20" className="fill-slate-50 dark:fill-slate-900" />
              <rect x="8" y="15" width="114" height="220" rx="10" strokeDasharray="3 3" />
              <circle cx="65" cy="8" r="3" className="fill-current" />
              <rect x="50" y="240" width="30" height="4" rx="2" className="fill-current" />
              <text x="65" y="130" textAnchor="middle" stroke="none" className="fill-slate-400 dark:fill-slate-600 text-xs font-semibold">ÖN EKRAN</text>
            </g>
            {/* Telefon 2: Arka Yüz */}
            <g transform="translate(230, 20)">
              <rect x="0" y="0" width="130" height="250" rx="20" className="fill-slate-50 dark:fill-slate-900" />
              {/* Kamera Adası */}
              <rect x="15" y="15" width="40" height="45" rx="10" />
              <circle cx="35" cy="28" r="8" />
              <circle cx="35" cy="48" r="5" />
              <text x="65" y="140" textAnchor="middle" stroke="none" className="fill-slate-400 dark:fill-slate-600 text-xs font-semibold">ARKA KASA</text>
            </g>
          </svg>
        ) : (
          /* Laptop Vektör Şeması */
          <svg viewBox="0 0 400 300" className="w-full h-full p-4 text-slate-300 dark:text-slate-700 fill-none stroke-current stroke-2">
            {/* Ekran */}
            <rect x="50" y="20" width="300" height="170" rx="10" className="fill-slate-50 dark:fill-slate-900" />
            <rect x="65" y="32" width="270" height="146" rx="4" strokeDasharray="3 3" />
            <circle cx="200" cy="26" r="2.5" className="fill-current" />
            <text x="200" y="110" textAnchor="middle" stroke="none" className="fill-slate-400 dark:fill-slate-600 text-xs font-semibold">LAPTOP EKRAN & KASA</text>
            {/* Alt Klavye Gövdesi */}
            <polygon points="30,200 370,200 390,260 10,260" className="fill-slate-100 dark:fill-slate-800" />
            <rect x="150" y="245" width="100" height="4" rx="2" className="fill-current" />
            {/* Touchpad */}
            <rect x="165" y="225" width="70" height="28" rx="4" />
          </svg>
        )}

        {/* Pin İğneleri */}
        {value.map((pin, idx) => {
          const config = PIN_TYPES.find(t => t.type === pin.type) || PIN_TYPES[0];
          return (
            <div
              key={pin.id}
              onClick={(e) => {
                e.stopPropagation();
                setActivePin(pin);
              }}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-10 cursor-pointer"
            >
              <div
                style={{ backgroundColor: config.color }}
                className="w-6 h-6 rounded-full text-white font-bold text-[11px] flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900 transform transition hover:scale-125"
              >
                {idx + 1}
              </div>

              {/* Tooltip & Silme */}
              <div className="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 text-white text-[10px] rounded shadow-xl whitespace-nowrap items-center gap-1.5 z-20">
                <span>{idx + 1}. {config.label}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => removePin(pin.id, e)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Eklenen İğne Açıklama Listesi */}
      {value.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          {value.map((pin, idx) => {
            const config = PIN_TYPES.find(t => t.type === pin.type) || PIN_TYPES[0];
            return (
              <div
                key={pin.id}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: config.color }}
                    className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{config.label}</span>
                  <span className="text-slate-400 text-[10px]">(Konum: %{pin.x}, %{pin.y})</span>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => removePin(pin.id, e)}
                    className="text-slate-400 hover:text-rose-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
