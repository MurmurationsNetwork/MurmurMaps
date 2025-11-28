import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const clusterUuid = params.cluster_uuid;

	return {
		title: 'Update Nodes',
		clusterUuid
	};
};
