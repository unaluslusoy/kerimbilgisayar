import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Code, Eye } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      ['clean'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }]
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background', 'align'
  ];

  return (
    <div className={`rich-text-editor flex flex-col h-full ${className}`}>
      {/* Editor Toolbar Header & Mode Toggle */}
      <div className="flex justify-end items-center px-4 py-1.5 bg-gray-50 border border-gray-200 border-b-0 rounded-t-xl gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors shadow-2xs"
          title={isHtmlMode ? "Görsel Moduna Geç" : "HTML Kaynak Kodu Düzenle"}
        >
          {isHtmlMode ? (
            <>
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Görsel Editör</span>
            </>
          ) : (
            <>
              <Code className="w-3.5 h-3.5 text-slate-600" />
              <span>Kaynak Kod (HTML)</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 relative border border-gray-200 rounded-b-xl overflow-hidden flex flex-col">
        {isHtmlMode ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="HTML Kodunuzu buraya yazın..."
            className="w-full flex-1 p-4 font-mono text-xs text-gray-800 bg-slate-900 text-slate-100 border-0 outline-none resize-none focus:ring-0 focus:ring-offset-0 leading-normal"
            style={{ minHeight: '250px' }}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 ql-editor-wrapper">
            <ReactQuill
              theme="snow"
              value={value || ''}
              onChange={onChange}
              modules={modules}
              formats={formats}
              placeholder={placeholder || 'Metin girin...'}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            />
          </div>
        )}
      </div>

      <style>{`
        .rich-text-editor .ql-container {
          flex: 1;
          display: flex;
          flex-col: column;
          min-height: 0;
          height: 100%;
          font-family: inherit;
          font-size: 0.875rem;
          border: none !important;
        }
        .rich-text-editor .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #e5e7eb !important;
          background-color: #f9fafb;
        }
        .rich-text-editor .ql-editor {
          flex: 1;
          overflow-y: auto !important;
          min-height: 200px;
          height: calc(100% - 42px);
          max-height: 100%;
        }
        .rich-text-editor .ql-editor-wrapper {
          height: 100%;
        }
      `}</style>
    </div>
  );
}
