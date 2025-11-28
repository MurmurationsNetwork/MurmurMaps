import { clusterSchemas } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { JSONSchema7 } from 'json-schema';

export async function getClusterSchema(db: DrizzleD1Database, clusterUuid: string) {
	return await db
		.select()
		.from(clusterSchemas)
		.where(eq(clusterSchemas.clusterUuid, clusterUuid))
		.get();
}

export async function insertClusterSchema(
	db: DrizzleD1Database,
	clusterUuid: string,
	schema: JSONSchema7
) {
	return await db.insert(clusterSchemas).values({
		clusterUuid,
		schemaJson: JSON.stringify(schema),
		fetchedAt: Math.floor(Date.now() / 1000)
	});
}
