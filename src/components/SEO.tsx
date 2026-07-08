import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  type?: string;
  name?: string;
  image?: string;
  url?: string;
  schema?: object;
}

export default function SEO({ title, description, type = 'website', name = 'Kerim Bilgisayar', image, url, schema }: SEOProps) {
  const fullTitle = `${title} | ${name}`;
  
  let canonicalUrl = url;
  if (!canonicalUrl && typeof window !== 'undefined') {
    canonicalUrl = window.location.href.split('?')[0];
  }
  if (canonicalUrl && canonicalUrl.endsWith('/') && canonicalUrl.split('/').length > 4) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* OpenGraph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={name} />

      {/* Twitter tags */}
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content={type === 'article' ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Schema.org JSON-LD for AI SEO */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
