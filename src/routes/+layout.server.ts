import type { MetaTag, LinkTag } from 'svelte-meta-tags';
import { defineBaseMetaTags } from 'svelte-meta-tags';
import { env } from '$env/dynamic/private';

export const load = async ({ locals, platform, url }) => {
  const defaultOrigin = env.ORIGIN || "http://localhost:5000";
  let canonicalUrl = defaultOrigin;
  if (
    env?.NODE_ENV &&
    env?.NODE_ENV === 'production' &&
    canonicalUrl.startsWith('http://')
  ) {
    canonicalUrl = canonicalUrl.replace('http://', 'https://');
  }

  const baseTags = defineBaseMetaTags({
    title: 'Link Shift - Shorten Long URLs',
    titleTemplate: '%s | Link Shift',
    description:
      'Route, mask, and control every link you share — free, with rotation and access rules built in.',
    keywords: [
      'Link Shift',
      'url shortener',
    ],
    canonical: canonicalUrl + url.pathname,
    additionalMetaTags: [
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0'
      },
      {
        property: 'dc:creator',
        content: 'Link Shift'
      },
      {
        name: 'application-name',
        content: 'Link Shift'
      },
      {
        httpEquiv: 'x-ua-compatible',
        content: 'IE=edge'
      },
      {
        name: 'description',
        content:
          'Route, mask, and control every link you share — free, with rotation and access rules built in.'
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes'
      },
      {
        name: 'mobile-web-app-status-bar-style',
        content: 'black-translucent'
      },
      {
        name: 'mobile-web-app-title',
        content: 'Link Shift'
      },
      {
        name: 'mobile-web-app-icon',
        content: '/favicon.ico'
      }
    ] as MetaTag[],
    additionalLinkTags: [
      {
        rel: 'canonical',
        href: canonicalUrl + url.pathname
      },
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: canonicalUrl + url.pathname
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        sizes: '96x96',
        href: '/logo.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/android-chrome-192x192.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/android-chrome-512x512.png'
      },
      {
        rel: 'apple-touch-icon',
        type: 'image/png',
        sizes: '180x180',
        href: '/apple-touch-icon.png'
      }
    ] as LinkTag[],
    openGraph: {
      type: 'website',
      url: canonicalUrl + url.pathname,
      locale: 'en_IE',
      title: 'Link Shift',
      description:
        'Route, mask, and control every link you share — free, with rotation and access rules built in.',
      siteName: 'Link Shift',
      images: [
        {
          url: '/logo.png',
          width: 800,
          height: 600,
          alt: 'Link Shift Cover Image',
          type: 'image/png'
        },
        {
          url: '/logo.png',
          width: 512,
          height: 512,
          alt: 'Link Shift Android Chrome Icon',
          type: 'image/x-icon'
        }
      ],
      profile: {
        firstName: 'Link Shift',
        lastName: 'Link Shift',
        username: 'linkcloacking'
      }
    }
  });

  return { ...baseTags };
};
