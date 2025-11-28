import { clusters } from '$lib/server/db/schema';
import type { ClusterDbUpdateInput, ClusterInsert } from '$lib/types/cluster';
import type { D1Result } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getClusters(db: DrizzleD1Database, sourceIndexId?: number) {
	const query = db.select().from(clusters);
	if (sourceIndexId) {
		query.where(eq(clusters.sourceIndexId, sourceIndexId));
	}
	return await query.all();
}

export async function getCluster(db: DrizzleD1Database, clusterUuid: string) {
	return await db.select().from(clusters).where(eq(clusters.clusterUuid, clusterUuid)).get();
}

export async function createCluster(db: DrizzleD1Database, cluster: ClusterInsert) {
	return await db.insert(clusters).values(cluster).run();
}

export async function updateCluster(
	db: DrizzleD1Database,
	clusterUuid: string,
	cluster: ClusterDbUpdateInput
) {
	return await db.update(clusters).set(cluster).where(eq(clusters.clusterUuid, clusterUuid)).run();
}

export async function deleteCluster(db: DrizzleD1Database, clusterUuid: string): Promise<D1Result> {
	return await db.delete(clusters).where(eq(clusters.clusterUuid, clusterUuid)).run();
}

export async function updateClusterTimestamp(
	db: DrizzleD1Database,
	clusterUuid: string,
	lastUpdated: number
) {
	return await db
		.update(clusters)
		.set({ lastUpdated })
		.where(eq(clusters.clusterUuid, clusterUuid))
		.run();
}
