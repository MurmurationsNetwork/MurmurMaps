import { getUsers } from '#lib/api/users.ts';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const { data: users, success, error } = await getUsers(fetch);

	if (!success) {
		return {
			users: [],
			error: error || 'Failed to load users'
		};
	}

	return {
		title: 'Users',
		users
	};
};
