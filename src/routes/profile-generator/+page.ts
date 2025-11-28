import { getToken } from '$lib/core';

import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const currentToken = await getToken('currentToken');

		return { title: 'Profile Generator', user: currentToken };
	} catch (err) {
		console.error('Error fetching schemas:', err);
		return { title: 'Profile Generator' };
	}
};
