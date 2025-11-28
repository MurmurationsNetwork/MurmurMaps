import type { profiles } from '$lib/server/db/schema';

export interface ProfileData {
	[key: string]: string | number | boolean | Date | null | ProfileData | ProfileData[];
}

export type ProfileValue = string | number | boolean | ProfileArray | ProfileObject;
export type ProfileArray = Array<ProfileValue>;

export interface ProfileObject {
	[key: string]: ProfileValue;
}

export interface ValidationError {
	status: number;
	source: ErrorSource;
	title: string;
	detail: string;
}

export interface ErrorSource {
	pointer: string;
	oid?: string;
}

export type ProfileCardType = {
	cuid: string;
	node_id: string;
	title: string;
	status: 'posted' | 'received' | 'validated' | 'deleted' | 'validation_failed' | 'post_failed';
	last_updated: string; // TODO - change to Unix timestamp (number) and convert into local date string
	schemas: string[];
};

export type Profile = typeof profiles.$inferSelect;

export type ProfileInsert = typeof profiles.$inferInsert;

export type ProfileCreateInput = Omit<
	ProfileInsert,
	'id' | 'userId' | 'cuid' | 'createdAt' | 'updatedAt'
>;

export type ProfileUpdateInput = Pick<
	Profile,
	'title' | 'profile' | 'lastUpdated' | 'sourceIndexId'
>;

export type ProfileDbUpdateInput = Pick<
	Profile,
	'title' | 'profile' | 'lastUpdated' | 'updatedAt' | 'sourceIndexId'
>;
