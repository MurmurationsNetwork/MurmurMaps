import { getDB } from '$lib/server/db';
import { getPublishedNodeCount, getPublishedNodes } from '$lib/server/models/node';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
	url
}) => {
	try {
		const db = getDB(platform.env);
		const clusterUuid = params?.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
		const limit = Math.max(Number(url.searchParams.get('limit') || 12), 1);
		const offset = (page - 1) * limit;
		const nameSearch = url.searchParams.get('name') || undefined;
		const tagsSearch = url.searchParams.get('tags') || undefined;
		const sort = url.searchParams.get('sort') as 'name-asc' | 'name-desc' | undefined;

		// Get dynamic filters for enum dropdowns
		const enumFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			if (!['name', 'tags', 'page', 'limit', 'sort'].includes(key)) {
				const trimmed = value.trim();
				if (trimmed !== '') {
					enumFilters[key] = trimmed;
				}
			}
		});

		const totalCount = await getPublishedNodeCount(
			db,
			clusterUuid,
			nameSearch,
			tagsSearch,
			enumFilters
		);
		const nodes = await getPublishedNodes(
			db,
			clusterUuid,
			limit,
			offset,
			nameSearch,
			tagsSearch,
			sort,
			enumFilters
		);

		if (!nodes || nodes.length === 0) {
			return json(
				{ error: 'No nodes found for the given criteria', success: false },
				{ status: 404 }
			);
		}

		return json(
			{
				data: nodes,
				meta: {
					total: totalCount,
					perPage: limit,
					currentPage: page,
					totalPages: Math.ceil(totalCount / limit)
				},
				success: true
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
