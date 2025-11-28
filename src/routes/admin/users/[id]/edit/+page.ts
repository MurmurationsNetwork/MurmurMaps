import { getRoles } from '$lib/api/role';
import { getUserRoles } from '$lib/api/users';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const userId = Number(params.id);

	try {
		const [userRolesData, allRolesData] = await Promise.all([
			getUserRoles(userId, fetch),
			getRoles(fetch)
		]);

		if (!userRolesData.success) {
			return {
				title: 'Edit User',
				error: userRolesData.error
			};
		}

		if (!allRolesData.success) {
			return {
				title: 'Edit User',
				error: allRolesData.error
			};
		}

		return {
			userRoles: userRolesData.data,
			allRoles: allRolesData.success ? allRolesData.data : [],
			userId
		};
	} catch (error) {
		console.error('Error loading user roles data:', error);
		return {
			userRoles: [],
			allRoles: [],
			userId
		};
	}
};
