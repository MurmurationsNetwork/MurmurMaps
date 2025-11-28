import { getSourceIndexById } from '$lib/api/source-indexes';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const id = parseInt(params.id ?? '');

	if (isNaN(id)) {
		return {
			title: 'Edit Source Index',
			sourceIndex: null,
			error: 'Invalid source index ID'
		};
	}

	try {
		const { data: sourceIndex } = await getSourceIndexById(id, fetch);

		return {
			title: 'Edit Source Index',
			sourceIndex
		};
	} catch (err) {
		console.error('Error loading source index:', err);
		return {
			title: 'Edit Source Index',
			sourceIndex: null,
			error: 'Failed to load source index'
		};
	}
};
