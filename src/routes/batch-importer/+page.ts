import { getToken } from '$lib/core';

import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const currentToken = await getToken('currentToken');

		return { title: 'Batch Importer', user: currentToken };
	} catch (err) {
		console.error('Error loading batch importer:', err);
		return { title: 'Batch Importer' };
	}
};
