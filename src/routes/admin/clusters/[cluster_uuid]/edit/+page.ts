import { getCluster } from '$lib/api/clusters';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const clusterUuid = params.cluster_uuid;

	try {
		const { data: cluster } = await getCluster(clusterUuid, fetch);

		return {
			title: 'Edit Cluster',
			cluster
		};
	} catch (err) {
		console.error('Error loading cluster:', err);
		return {
			title: 'Edit Cluster',
			cluster: null
		};
	}
};
