import { useEffect } from 'react';
import { BRAND } from '../../utils/constants';

const SITE_URL = 'https://www.askittechnologies.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SeoProps {
  /** Page-specific title. Rendered as "<title> | ASK IT Technologies". */
  title: string;
  /** Page-specific meta description, ideally built from the page's own copy. */
  description: string;
  /** Path only, e.g. "/courses" — combined with SITE_URL for canonical + OG url. */
  path: string;
  /** Extra keywords beyond the site-wide defaults. */
  keywords?: string[];
  /** Absolute image URL for social previews; falls back to the site default. */
  image?: string;
  /** Set true on pages that shouldn't be indexed (auth flows, verification tokens, etc.) */
  noIndex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// Dependency-free per-page SEO: sets document.title plus the meta/link/JSON-LD
// tags that matter for search + social sharing, whenever a public page
// mounts or its props change. No react-helmet needed for a project this
// size — this is the same handful of tags it would manage, applied directly.
export default function Seo({ title, description, path, keywords = [], image, noIndex = false }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | ${BRAND.fullName}`;
    const url = `${SITE_URL}${path === '/' ? '' : path}`;
    const ogImage = image || DEFAULT_OG_IMAGE;

    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta(
      'name',
      'keywords',
      ['IT training', 'internships', BRAND.name, 'Hyderabad IT courses', ...keywords].join(', ')
    );
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    upsertLink('canonical', url);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:site_name', BRAND.fullName);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertJsonLd('seo-breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...(path !== '/' ? [{ '@type': 'ListItem', position: 2, name: title, item: url }] : []),
      ],
    });
  }, [title, description, path, image, noIndex, keywords.join(',')]);

  return null;
}
