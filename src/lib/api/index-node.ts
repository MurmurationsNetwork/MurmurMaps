import { request } from '$lib/api/request';
import type { IndexNode } from '$lib/types/index-node';

export const getIndexNodes = (searchParams: string, customFetch?: typeof fetch) =>
	request<undefined, IndexNode[]>(
		`/api/index/nodes?${searchParams}`,
		'GET',
		undefined,
		customFetch
	);
