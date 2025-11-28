import { clusters } from '$lib/server/db/schema';

export type Cluster = typeof clusters.$inferSelect;

export type ClusterInsert = typeof clusters.$inferInsert;

export type ClusterCreateInput = Omit<
	ClusterInsert,
	'id' | 'clusterUuid' | 'createdAt' | 'updatedAt' | 'lastUpdated'
>;

export type ClusterUpdateInput = Pick<Cluster, 'name' | 'centerLat' | 'centerLon' | 'scale'>;

export type ClusterDbUpdateInput = Pick<
	Cluster,
	'name' | 'description' | 'centerLat' | 'centerLon' | 'scale' | 'updatedAt'
>;

export type ClusterPublic = Omit<Cluster, 'id'>;

export type ClusterWithJobUuid = ClusterInsert & {
	jobUuid: string;
};
