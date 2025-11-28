import { getClusters } from '$lib/api/clusters';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const { data: clusters } = await getClusters(undefined, fetch);

	return {
		title: 'Cluster Management',
		clusters
	};
};
