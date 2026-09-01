import { definePageMetaTags } from 'svelte-meta-tags';
export const load = async ({ locals }) => {
  const { user, session } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Link Shift - Shorten Long URLs',
    robots: 'index, follow',
    twitter: {
      cardType: 'summary_large_image',
      site: '@x_tube',
      image: '/logo.png',
      title: 'Link Shift - Shorten Long URLs'
    }
  });

  return {
    ...pageMetaTags,
    user,
    session,
  };
};