import { getDB } from '$lib/server/db';
import { getCluster } from '$lib/server/models/cluster';
import { getClusterSchema, insertClusterSchema } from '$lib/server/models/cluster-schema';
import { getDistinctLinkedSchemas } from '$lib/server/models/node';
import { getSourceIndexByUrl } from '$lib/server/models/source-index';
import type { D1Database } from '@cloudflare/workers-types';
import { json, type RequestHandler } from '@sveltejs/kit';
import type { JSONSchema7 } from 'json-schema';

export const GET: RequestHandler = async ({
	params,
	platform = { env: { DB: {} as D1Database } },
	fetch
}) => {
	try {
		const db = getDB(platform.env);
		const clusterUuid = params.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Invalid cluster UUID', success: false }, { status: 400 });
		}

		// Check if schema exists in db
		const clusterSchema = await getClusterSchema(db, clusterUuid);
		if (clusterSchema) {
			return json({ data: JSON.parse(clusterSchema.schemaJson), success: true }, { status: 200 });
		}

		const cluster = await getCluster(db, clusterUuid);

		if (!cluster) {
			return json({ error: 'Cluster not found', success: false }, { status: 404 });
		}

		const sourceIndex = await getSourceIndexByUrl(db, cluster.indexUrl);

		if (!sourceIndex) {
			return json({ error: 'Source index not found', success: false }, { status: 404 });
		}

		const linkedSchemas = await getDistinctLinkedSchemas(db, clusterUuid);

		if (linkedSchemas.length === 0) {
			return json({ error: 'No linked schemas found', success: false }, { status: 404 });
		}

		const schemaPromises = linkedSchemas.map((schema) =>
			fetchSchema(schema, sourceIndex.libraryUrl, fetch)
		);

		const results = await Promise.all(schemaPromises);
		const fetchedSchemas = results.filter((schema): schema is JSONSchema7 => schema !== null);
		const schemaData = mergeSchemas(fetchedSchemas);

		// Insert schema into db
		await insertClusterSchema(db, clusterUuid, schemaData);

		return json({ data: schemaData, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

function mergeSchemas(schemas: JSONSchema7[]): JSONSchema7 {
	const merged: JSONSchema7 = {
		type: 'object',
		properties: {},
		required: []
	};

	for (const schema of schemas) {
		if (schema.properties) {
			for (const [key, value] of Object.entries(schema.properties)) {
				if (!merged.properties![key]) {
					merged.properties![key] = value;
				}
			}
		}

		if (schema.required) {
			const requiredSet = new Set([...merged.required!, ...schema.required]);
			merged.required = [...requiredSet];
		}
	}

	return merged;
}

async function fetchSchema(
	schemaName: string,
	baseUrl: string,
	fetchFn: typeof fetch
): Promise<JSONSchema7 | null> {
	const schemaUrl = `${baseUrl}/schemas/${schemaName}`;
	try {
		const response = await fetchFn(schemaUrl, {
			headers: { 'Content-Type': 'application/json' }
		});
		if (!response.ok) {
			console.error(`Failed to fetch schema: ${schemaName}`);
			return null;
		}
		const schema: JSONSchema7 = await response.json();
		return schema;
	} catch (err) {
		console.error(`Error fetching schema ${schemaName}:`, err);
		return null;
	}
}
