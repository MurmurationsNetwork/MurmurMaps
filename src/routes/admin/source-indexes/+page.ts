import { getSourceIndexes } from '$lib/api/source-indexes';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const { data: sourceIndexes } = await getSourceIndexes(fetch);

	return {
		title: 'Source Index Configuration',
		sourceIndexes
	};
};
