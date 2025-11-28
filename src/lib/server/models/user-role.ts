import { roles, userRoles, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getRoleIdsByUserId(db: DrizzleD1Database, userId: number) {
	const result = await db
		.select({ roleId: userRoles.roleId })
		.from(userRoles)
		.where(eq(userRoles.userId, userId))
		.all();

	return result.map((row) => row.roleId);
}

export async function insertUserRole(db: DrizzleD1Database, userId: number, roleName: string) {
	const roleId = await getRoleIdByName(db, roleName);
	await db.insert(userRoles).values({ userId, roleId });
}

export async function getRoleIdByName(db: DrizzleD1Database, roleName: string) {
	const result = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, roleName))
		.all();
	return result[0]?.id;
}

export async function updateUserRoles(db: DrizzleD1Database, userId: number, roleIds: number[]) {
	await db.delete(userRoles).where(eq(userRoles.userId, userId)).run();

	if (roleIds.length > 0) {
		const values = roleIds.map((roleId) => ({ userId, roleId }));
		await db.insert(userRoles).values(values).run();
	}

	await db
		.update(users)
		.set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
		.where(eq(users.id, userId))
		.run();
}
