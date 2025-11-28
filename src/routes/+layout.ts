import { getSourceIndexes } from '$lib/api/source-indexes';

import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch }) => {
	const { data: sourceIndexes } = await getSourceIndexes(fetch);

	return {
		sourceIndexes
	};
};
