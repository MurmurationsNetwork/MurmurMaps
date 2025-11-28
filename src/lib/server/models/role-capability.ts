import { roleCapabilities, userRoles, users } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getCapabilityIdsByRoleId(db: DrizzleD1Database, roleId: number) {
	const result = await db
		.select({ capabilityId: roleCapabilities.capabilityId })
		.from(roleCapabilities)
		.where(eq(roleCapabilities.roleId, roleId))
		.all();

	return result.map((row) => row.capabilityId);
}

export async function getCapabilityIdsByRoleIds(db: DrizzleD1Database, roleIds: number[]) {
	if (roleIds.length === 0) {
		return [];
	}

	const result = await db
		.select({ capabilityId: roleCapabilities.capabilityId })
		.from(roleCapabilities)
		.where(inArray(roleCapabilities.roleId, roleIds))
		.all();

	const uniqueCapabilityIds = [...new Set(result.map((row) => row.capabilityId))];
	return uniqueCapabilityIds;
}

export async function updateRoleCapabilities(
	db: DrizzleD1Database,
	roleId: number,
	capabilityIds: number[]
) {
	await db.delete(roleCapabilities).where(eq(roleCapabilities.roleId, roleId)).run();

	if (capabilityIds.length === 0) {
		return;
	}

	for (const ids of chunk(capabilityIds, 10)) {
		const values = ids.map((capabilityId) => ({ roleId, capabilityId }));
		await db.insert(roleCapabilities).values(values).run();
	}

	// update user permissionsVersion
	const userRows = await db
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.where(eq(userRoles.roleId, roleId))
		.all();

	const userIds = userRows.map((r) => r.userId);

	if (userIds.length === 0) return;

	await db
		.update(users)
		.set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
		.where(inArray(users.id, userIds))
		.run();
}

function chunk<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}
