import { getDB } from '$lib/server/db';
import { getNodes } from '$lib/server/models/node';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params
}) => {
	try {
		const db = getDB(platform.env);
		const clusterUuid = params.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		const nodes = await getNodes(db, clusterUuid);
		const authorityHosts = new Set<string>();

		for (const node of nodes) {
			try {
				const data = JSON.parse(node.data);
				const primaryUrl = data.primary_url;

				if (!primaryUrl) continue;

				const profileHost = new URL(node.profileUrl).hostname;
				const primaryHost = new URL(primaryUrl).hostname;

				if (profileHost === primaryHost) {
					authorityHosts.add(primaryHost);
				}
			} catch (urlError) {
				// Skip invalid URLs
				console.warn(`Invalid URL in node ${node.id}:`, urlError);
				continue;
			}
		}

		return json({ data: Array.from(authorityHosts), success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
