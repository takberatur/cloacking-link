import { definePageMetaTags } from 'svelte-meta-tags';
export const load = async ({ locals }) => {
  const { user, session } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Contact',
    robots: 'index, follow',
    twitter: {
      cardType: 'summary_large_image',
      site: '@x_tube',
      image: '/logo.png',
      title: 'Contact'
    }
  });

  return {
    ...pageMetaTags,
    user,
    session,
  };
};