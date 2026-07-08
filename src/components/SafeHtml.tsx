import DOMPurify from 'dompurify';

/**
 * CMS/DB kaynaklı HTML içeriğini XSS'e karşı temizleyerek render eder.
 * Ham `dangerouslySetInnerHTML` yerine bunu kullanın.
 *
 * Kullanım:
 *   <SafeHtml html={page.content} className="prose" />
 */
export default function SafeHtml({
  html,
  className,
}: {
  html?: string | null;
  className?: string;
}) {
  const clean = DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
