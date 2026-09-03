import { definePageMetaTags } from 'svelte-meta-tags';

export const load = async ({ locals }) => {
  const { user, session, setting } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Account & Security',
    robots: 'noindex, nofollow'
  });

  return {
    ...pageMetaTags,
    user,
    session,
    setting
  }
}