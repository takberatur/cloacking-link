
export const load = async ({ locals }) => {
  const { user, session } = locals

  return {
    user,
    session
  }
}