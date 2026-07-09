import React from 'react';
import DOMPurify from 'dompurify';

/**
 * RenderEngine — page_blocks kayıtlarını gerçek DOM'a dönüştürür.
 *
 * Her blok: { elementKey: string, props: object, isVisible?: boolean, sortOrder?: number }
 * `elementKey` bilinen tiplerle eşleşmezse blok atlanır (uygulama kırılmaz).
 * Blok yoksa `defaultContent` render edilir (geriye dönük uyumlu).
 */

interface Block {
  id?: number | string;
  elementKey: string;
  props?: Record<string, any>;
  isVisible?: boolean;
  sortOrder?: number;
}

function clean(html?: string) {
  return DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
}

function BlockRenderer({ block }: { block: Block; key?: React.Key }) {
  const p = block.props || {};
  switch (block.elementKey) {
    case 'heading': {
      const level = Math.min(Math.max(parseInt(p.level) || 2, 1), 6);
      const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag className={p.className || 'text-2xl font-bold text-gray-900 my-4'}>{p.text || ''}</Tag>;
    }
    case 'text':
    case 'paragraph':
      return <p className={p.className || 'text-gray-600 leading-relaxed my-3'}>{p.text || ''}</p>;
    case 'richtext':
    case 'html':
      return (
        <div
          className={p.className || 'prose max-w-none'}
          dangerouslySetInnerHTML={{ __html: clean(p.html || p.content) }}
        />
      );
    case 'image':
      return p.src ? (
        <img
          src={p.src}
          alt={p.alt || ''}
          loading="lazy"
          className={p.className || 'w-full h-auto rounded-xl my-4'}
        />
      ) : null;
    case 'button':
      return (
        <a
          href={p.url || '#'}
          target={p.target || '_self'}
          className={p.className || 'inline-block bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl font-semibold transition-colors'}
        >
          {p.label || 'Buton'}
        </a>
      );
    case 'spacer':
      return <div style={{ height: `${parseInt(p.height) || 24}px` }} aria-hidden="true" />;
    case 'divider':
      return <hr className={p.className || 'my-6 border-gray-200'} />;
    default:
      // Bilinmeyen blok tipi — sessizce atla (uygulamayı kırma)
      return null;
  }
}

export const RenderEngine = ({
  blocks,
  defaultContent,
}: {
  blocks?: Block[];
  defaultContent?: React.ReactNode;
}) => {
  const visible = (blocks || [])
    .filter((b) => b && b.isVisible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (visible.length === 0) {
    return <>{defaultContent}</>;
  }

  return (
    <>
      {visible.map((block, i) => (
        <BlockRenderer key={block.id ?? i} block={block} />
      ))}
    </>
  );
};

export default RenderEngine;
