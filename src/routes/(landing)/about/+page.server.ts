import { definePageMetaTags } from 'svelte-meta-tags';
export const load = async ({ locals }) => {
  const { user, session } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'LinkShift — Multi-URL cloaking & rotating redirects, free',
    robots: 'index, follow',
    twitter: {
      cardType: 'summary_large_image',
      site: '@x_tube',
      image: '/logo.png',
      title: 'LinkShift — Multi-URL cloaking & rotating redirects, free'
    }
  });

  return {
    ...pageMetaTags,
    user,
    session,
  };
};