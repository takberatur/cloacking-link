import { definePageMetaTags } from 'svelte-meta-tags';
export const load = async ({ locals }) => {
  const { user, session } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Documentations',
    robots: 'index, follow',
    twitter: {
      cardType: 'summary_large_image',
      site: '@x_tube',
      image: '/logo.png',
      title: 'Documentations'
    }
  });

  return {
    ...pageMetaTags,
    user,
    session,
  };
};