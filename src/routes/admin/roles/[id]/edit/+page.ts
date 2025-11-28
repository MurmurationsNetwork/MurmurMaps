import { getCapabilities } from '$lib/api/capabilities';
import { getRoleCapabilities } from '$lib/api/role';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const roleId = parseInt(params.id);

		if (isNaN(roleId)) {
			return {
				title: 'Edit Role',
				error: 'Invalid role ID'
			};
		}

		const [roleCapabilitiesResult, allCapabilitiesResult] = await Promise.all([
			getRoleCapabilities(roleId, fetch),
			getCapabilities(fetch)
		]);

		if (!roleCapabilitiesResult.success) {
			return {
				title: 'Edit Role',
				error: roleCapabilitiesResult.error
			};
		}

		if (!allCapabilitiesResult.success) {
			return {
				title: 'Edit Role',
				error: allCapabilitiesResult.error
			};
		}

		return {
			title: 'Edit Role',
			roleId,
			roleCapabilities: roleCapabilitiesResult.data,
			allCapabilities: allCapabilitiesResult.data
		};
	} catch (error) {
		console.error('Error loading role edit data:', error);
		return {
			title: 'Edit Role',
			error: error instanceof Error ? error.message : 'Failed to load role data'
		};
	}
};
