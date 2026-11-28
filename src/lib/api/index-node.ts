import { request } from '#lib/api/request.ts';
import type { IndexNode } from '#lib/types/index-node.d.ts';

export const getIndexNodes = (searchParams: string, customFetch?: typeof fetch) =>
	request<undefined, IndexNode[]>(
		`/api/index/nodes?${searchParams}`,
		'GET',
		undefined,
		customFetch
	);
