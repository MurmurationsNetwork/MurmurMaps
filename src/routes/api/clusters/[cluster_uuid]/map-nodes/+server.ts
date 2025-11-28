import { getDB } from '$lib/server/db';
import { getPublishedMapNodes } from '$lib/server/models/node';
import type { MapNode } from '$lib/types/node';
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

		const nameSearch = url.searchParams.get('name') || undefined;
		const tagsSearch = url.searchParams.get('tags') || undefined;

		// Get dynamic filters for enum dropdowns
		const enumFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			if (!['name', 'tags', 'sort'].includes(key)) {
				const trimmed = value.trim();
				if (trimmed !== '') {
					enumFilters[key] = trimmed;
				}
			}
		});

		const nodes = await getPublishedMapNodes(db, clusterUuid, nameSearch, tagsSearch, enumFilters);

		if (!nodes || nodes.length === 0) {
			return json(
				{ error: 'No nodes found for the given criteria', success: false },
				{ status: 404 }
			);
		}

		const mapNodes: MapNode[] = nodes.map((node) => {
			const data = typeof node.data === 'string' ? JSON.parse(node.data) : node.data;
			return {
				id: node.id,
				lat: data?.geolocation?.lat,
				lon: data?.geolocation?.lon,
				primaryUrl: data?.primary_url ?? ''
			};
		});

		return json(
			{
				data: mapNodes,
				success: true
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
