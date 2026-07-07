import { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const iconNames = Object.keys(LucideIcons)
  .filter(name => /^[A-Z]/.test(name) && !name.endsWith('Icon') && typeof (LucideIcons as any)[name] === 'function')
  .sort((a, b) => a.localeCompare(b));

export default function LucideIconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value || '');
  const SelectedIcon = value ? (LucideIcons as any)[value] : null;

  const filteredIcons = useMemo(() => {
    const search = query.trim().toLowerCase();
    return iconNames
      .filter(name => !search || name.toLowerCase().includes(search))
      .slice(0, 36);
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="w-10 h-10 rounded-theme border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
          {SelectedIcon ? <SelectedIcon className="w-5 h-5 text-gray-700" /> : <span className="text-xs text-gray-400">?</span>}
        </div>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          placeholder="İkon ara: Server, Laptop, Shield..."
        />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto rounded-theme border border-gray-100 bg-gray-50 p-2">
        {filteredIcons.map(name => {
          const Icon = (LucideIcons as any)[name];
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setQuery(name);
              }}
              className={`flex flex-col items-center gap-1 rounded-theme border px-2 py-2 text-[11px] transition-colors ${selected ? 'border-primary bg-primary-subtle text-gray-900' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:bg-primary-subtle'}`}
              title={name}
            >
              <Icon className="w-5 h-5" />
              <span className="w-full truncate text-center">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}