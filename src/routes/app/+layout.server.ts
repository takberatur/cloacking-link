import { redirect } from '@sveltejs/kit';
export const load = async ({ locals }) => {

  const { user, session, setting } = locals;

  if (!user) {
    throw redirect(302, '/signin');
  }

  return {
    user,
    session,
    setting
  }
}