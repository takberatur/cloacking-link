export const load = async ({ locals }) => {
	const { user, session, setting } = locals;
	return {
		user,
		session,
		setting
	};
};
