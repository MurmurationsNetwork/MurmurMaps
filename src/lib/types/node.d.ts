import { nodes } from '$lib/server/db/schema';
import type { ProfileData } from '$lib/types/profile';

export type Node = typeof nodes.$inferSelect;

export type NodeInsert = typeof nodes.$inferInsert;

export type NodeCreateInput = Omit<NodeInsert, 'clusterUuid' | 'data'> & {
	data: ProfileData;
};

export type NodeUpdateInput = Omit<NodeInsert, 'clusterUuid' | 'profileUrl' | 'data'> & {
	data: ProfileData;
	updatedData?: ProfileData;
};

export type NodeDbUpdateInput = Pick<
	NodeInsert,
	| 'data'
	| 'updatedData'
	| 'status'
	| 'lastUpdated'
	| 'isAvailable'
	| 'unavailableMessage'
	| 'hasAuthority'
	| 'hasUpdated'
	| 'updatedAt'
>;

export type MapNode = {
	id: number;
	lat: number;
	lon: number;
	primaryUrl: string;
};
