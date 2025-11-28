import { profiles } from '$lib/server/db/schema';
import type { ProfileDbUpdateInput, ProfileInsert } from '$lib/types/profile';
import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getProfiles(db: DrizzleD1Database) {
	return await db.select().from(profiles).all();
}

export async function getProfile(db: DrizzleD1Database, cuid: string) {
	return await db.select().from(profiles).where(eq(profiles.cuid, cuid)).get();
}

export async function getProfilesByUserId(
	db: DrizzleD1Database,
	userId: number,
	sourceIndexId: number
) {
	return await db
		.select()
		.from(profiles)
		.where(and(eq(profiles.userId, userId), eq(profiles.sourceIndexId, sourceIndexId)))
		.all();
}

export async function getProfileByCuid(db: DrizzleD1Database, cuid: string, userId: number) {
	return await db
		.select()
		.from(profiles)
		.where(and(eq(profiles.cuid, cuid), eq(profiles.userId, userId)))
		.get();
}

export async function createProfile(db: DrizzleD1Database, profile: ProfileInsert) {
	return await db.insert(profiles).values(profile).run();
}

export async function updateProfileNodeId(
	db: DrizzleD1Database,
	cuid: string,
	userId: number,
	nodeId: string
) {
	return await db
		.update(profiles)
		.set({ nodeId, updatedAt: Math.floor(new Date().getTime() / 1000) })
		.where(and(eq(profiles.cuid, cuid), eq(profiles.userId, userId)))
		.run();
}

export async function updateProfile(
	db: DrizzleD1Database,
	cuid: string,
	userId: number,
	profile: ProfileDbUpdateInput
) {
	return await db
		.update(profiles)
		.set(profile)
		.where(and(eq(profiles.cuid, cuid), eq(profiles.userId, userId)))
		.run();
}

export async function deleteProfile(db: DrizzleD1Database, cuid: string, userId: number) {
	return await db
		.delete(profiles)
		.where(and(eq(profiles.cuid, cuid), eq(profiles.userId, userId)))
		.run();
}
