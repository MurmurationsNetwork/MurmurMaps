import { getCluster, getEnumsDropdown } from '$lib/api/clusters';
import { getPublishedMapNodes } from '$lib/api/nodes';

import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch, params, url }) => {
	const clusterUuid = params.cluster_uuid;

	const showSearchParam = url.searchParams.get('showSearch');
	const showSearch = showSearchParam !== 'false';

	const nameSearch = url.searchParams.get('name') || '';
	const tagSearch = url.searchParams.get('tags') || '';
	const enumFilters = Object.fromEntries(
		Array.from(url.searchParams.entries()).filter(
			([key]) =>
				key !== 'page' && key !== 'name' && key !== 'tags' && key !== 'sort' && key !== 'showSearch'
		)
	);

	const { data: cluster } = await getCluster(clusterUuid, fetch);
	const { data: nodes } = await getPublishedMapNodes(
		clusterUuid,
		nameSearch,
		tagSearch,
		enumFilters,
		fetch
	);
	const { data: enumsDropdown } = await getEnumsDropdown(clusterUuid, fetch);

	return {
		title: cluster?.name || 'Embedded Map',
		cluster,
		nodes,
		enumsDropdown,
		nameSearch,
		tagSearch,
		enumFilters,
		showSearch
	};
};
