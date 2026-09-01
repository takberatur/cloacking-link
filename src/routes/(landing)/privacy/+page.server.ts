import { definePageMetaTags } from 'svelte-meta-tags';
export const load = async ({ locals }) => {
  const { user, session } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Privacy Policy',
    robots: 'index, follow',
    twitter: {
      cardType: 'summary_large_image',
      site: '@x_tube',
      image: '/logo.png',
      title: 'Privacy Policy'
    }
  });

  return {
    ...pageMetaTags,
    user,
    session,
  };
};