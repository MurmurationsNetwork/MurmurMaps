import { getCapabilities } from '$lib/api/capabilities';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const { data: capabilities, error, success } = await getCapabilities(fetch);

		if (!success) {
			return {
				capabilities: [],
				error: error || 'Failed to fetch capabilities'
			};
		}

		return {
			title: 'Capabilities',
			capabilities
		};
	} catch (error) {
		console.error('Error loading capabilities:', error);
		return {
			capabilities: [],
			error: error instanceof Error ? error.message : 'Failed to load capabilities'
		};
	}
};
