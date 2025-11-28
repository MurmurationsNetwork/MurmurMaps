import { getCluster, getEnumsDropdown } from '$lib/api/clusters';
import { getPublishedNodes } from '$lib/api/nodes';
import { getSchema } from '$lib/api/schemas';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, url }) => {
	const clusterUuid = params.cluster_uuid;

	const page = parseInt(url.searchParams.get('page') ?? '1', 10);
	const currentPage = isNaN(page) || page < 1 ? 1 : page;

	const nameSearch = url.searchParams.get('name') || '';
	const tagSearch = url.searchParams.get('tags') || '';
	const enumFilters = Object.fromEntries(
		Array.from(url.searchParams.entries()).filter(
			([key]) => key !== 'page' && key !== 'name' && key !== 'tags' && key !== 'sort'
		)
	);

	// sort value can only be `name-asc`, `name-desc`, `default`. if not, set to `default`
	const sortParam = url.searchParams.get('sort');
	const validSortOptions = ['name-asc', 'name-desc', 'default'] as const;
	const sort = validSortOptions.includes(sortParam as (typeof validSortOptions)[number])
		? (sortParam as 'name-asc' | 'name-desc' | 'default')
		: 'default';

	const { data: cluster } = await getCluster(clusterUuid, fetch);
	const { data: nodes, meta } = await getPublishedNodes(
		clusterUuid,
		currentPage,
		nameSearch,
		tagSearch,
		sort,
		enumFilters,
		fetch
	);

	const { data: enumsDropdown } = await getEnumsDropdown(clusterUuid, fetch);
	const { data: schema } = await getSchema(clusterUuid, fetch);

	return {
		title: cluster?.name || 'Nodes List',
		cluster,
		nodes,
		meta,
		enumsDropdown,
		nameSearch,
		tagSearch,
		sort,
		enumFilters,
		schema
	};
};
