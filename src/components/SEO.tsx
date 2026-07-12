import React from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  type?: string;
  name?: string;
  image?: string;
  url?: string;
  schema?: object | object[];
  noindex?: boolean;
  geoRegion?: string;
  geoLat?: string;
  geoLng?: string;
  geoPlacename?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  breadcrumbs?: { name: string; url: string }[];
}

export default function SEO({
  title, description, type = "website", name = "Kerim Bilgisayar",
  image, url, schema, noindex = false,
  geoRegion, geoLat, geoLng, geoPlacename,
  publishedTime, modifiedTime, author,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = `${title} | ${name}`;

  let canonicalUrl = url;
  if (!canonicalUrl && typeof window !== "undefined") {
    canonicalUrl = window.location.href.split("?")[0];
  }
  if (canonicalUrl && canonicalUrl.endsWith("/") && canonicalUrl.split("/").length > 4) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }

  const hasGeo = geoLat && geoLng;

  const schemas: object[] = [];
  if (schema) {
    if (Array.isArray(schema)) schemas.push(...schema);
    else schemas.push(schema);
  }
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((bc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: bc.name,
        item: bc.url,
      })),
    });
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={name} />
      <meta property="og:locale" content="tr_TR" />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime  && <meta property="article:modified_time"  content={modifiedTime}  />}
      {author        && <meta property="article:author"         content={author}        />}

      <meta name="twitter:card"        content={type === "article" ? "summary_large_image" : "summary"} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:creator"     content={name} />
      {image && <meta name="twitter:image" content={image} />}

      {geoRegion    && <meta name="geo.region"    content={geoRegion}    />}
      {geoPlacename && <meta name="geo.placename" content={geoPlacename} />}
      {hasGeo       && <meta name="geo.position"  content={`${geoLat};${geoLng}`} />}
      {hasGeo       && <meta name="ICBM"          content={`${geoLat}, ${geoLng}`} />}

      {schemas.length > 0 && schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
