import { getRoles } from '$lib/api/role';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const { data: roles, success, error } = await getRoles(fetch);

		if (!success) {
			return {
				title: 'Roles',
				roles: [],
				error: error
			};
		}

		return {
			title: 'Roles',
			roles
		};
	} catch (error) {
		console.error('Error loading roles:', error);
		return {
			title: 'Roles',
			roles: [],
			error: error instanceof Error ? error.message : 'Failed to load roles'
		};
	}
};
