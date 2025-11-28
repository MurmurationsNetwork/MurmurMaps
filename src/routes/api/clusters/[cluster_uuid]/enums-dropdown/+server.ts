import { getDB } from '$lib/server/db';
import { getCluster } from '$lib/server/models/cluster';
import { getSourceIndexByUrl } from '$lib/server/models/source-index';
import type { DropdownField, SchemaData, SchemaProperty } from '$lib/types/enum-dropdown';
import type { D1Database } from '@cloudflare/workers-types';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = getDB(platform?.env as { DB: D1Database });
	const clusterUuid = params.cluster_uuid;

	if (!clusterUuid) {
		return json({ error: 'Missing cluster_uuid' }, { status: 400 });
	}

	// Find the cluster
	const cluster = await getCluster(db, clusterUuid);

	if (!cluster || !cluster.queryUrl) {
		return json({ error: 'Cluster or query_url not found' }, { status: 404 });
	}

	// Parse the query_url to get the schema
	const queryParams = new URLSearchParams(cluster.queryUrl.split('?')[1]);
	const schema = queryParams.get('schema');
	if (!schema) {
		return json({ error: 'Missing schema parameter in query_url' }, { status: 400 });
	}

	// Get the source index
	const sourceIndex = await getSourceIndexByUrl(db, cluster.indexUrl);

	if (!sourceIndex) {
		return json({ error: 'Source index not found' }, { status: 404 });
	}

	// Get the schema JSON
	const schemaUrl = `${sourceIndex?.libraryUrl}/schemas/${schema}`;
	const res = await fetch(schemaUrl);
	if (!res.ok) {
		return json({ error: 'Failed to fetch schema' }, { status: 500 });
	}
	const schemaData: SchemaData = await res.json();

	if (!schemaData.properties) {
		return json({ error: 'Invalid schema format' }, { status: 500 });
	}

	// Extract the enum or array.enum fields
	const dropdowns: DropdownField[] = [];

	for (const [fieldName, property] of Object.entries(schemaData.properties)) {
		const prop = property as SchemaProperty;

		if (prop.enum) {
			const options = prop.enum.map((value: string, index: number) => ({
				value,
				label: prop.enumNames?.[index] || value
			}));
			dropdowns.push({ field_name: fieldName, title: prop.title || fieldName, options });
		} else if (prop.type === 'array' && prop.items?.type === 'string' && prop.items?.enum) {
			const options = prop.items.enum.map((value: string, index: number) => ({
				value,
				label: prop.items?.enumNames?.[index] || value
			}));
			dropdowns.push({ field_name: fieldName, title: prop.title || fieldName, options });
		}
	}

	return json({ data: dropdowns, success: true }, { status: 200 });
};
