import React from 'react';
import { JSONSchema } from '../../elements/registry';

interface DynamicFormProps {
  schema: JSONSchema;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}

export default function DynamicForm({ schema, value, onChange }: DynamicFormProps) {
  const handleChange = (key: string, val: any) => {
    onChange({ ...value, [key]: val });
  };

  const renderField = (key: string, fieldSchema: any) => {
    const val = value[key] !== undefined ? value[key] : fieldSchema.default;

    switch (fieldSchema.widget) {
      case 'textarea':
        return (
          <textarea
            className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm"
            value={val || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={4}
          />
        );
      case 'select':
        return (
          <select
            className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm"
            value={val || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          >
            <option value="">Seçiniz...</option>
            {fieldSchema.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'toggle':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
              checked={!!val}
              onChange={(e) => handleChange(key, e.target.checked)}
            />
            <span className="text-sm text-gray-700">{fieldSchema.title}</span>
          </label>
        );
      // Diğer widget tipleri (image, color, vb.) buraya eklenecek
      case 'text':
      default:
        return (
          <input
            type={fieldSchema.type === 'number' ? 'number' : 'text'}
            className="w-full border border-gray-300 rounded-theme px-3 py-2 text-sm"
            value={val || ''}
            onChange={(e) => handleChange(key, fieldSchema.type === 'number' ? Number(e.target.value) : e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, fieldSchema]) => (
        <div key={key} className="flex flex-col gap-1.5">
          {fieldSchema.widget !== 'toggle' && (
            <label className="text-sm font-medium text-gray-700">
              {fieldSchema.title}
            </label>
          )}
          {fieldSchema.description && (
            <p className="text-xs text-gray-500">{fieldSchema.description}</p>
          )}
          {renderField(key, fieldSchema)}
        </div>
      ))}
    </div>
  );
}
