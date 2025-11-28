import { roles, userRoles, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getUserIdByName(db: DrizzleD1Database, name: string) {
	return await db.select({ id: users.id }).from(users).where(eq(users.name, name)).get();
}

export async function insertUser(db: DrizzleD1Database, name: string) {
	return await db
		.insert(users)
		.values({ name, normalizedName: name.toLowerCase() })
		.returning({ id: users.id })
		.get();
}

export async function doesNameExist(db: DrizzleD1Database, name: string): Promise<boolean> {
	const result = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.normalizedName, name.toLowerCase()))
		.get();
	return result !== undefined;
}

export async function getByUserId(db: DrizzleD1Database, id: number) {
	return await db
		.select({
			name: users.name,
			emailReset: users.emailReset,
			enableSiteHints: users.enableSiteHints
		})
		.from(users)
		.where(eq(users.id, id))
		.get();
}

export async function updateUserEmailReset(
	db: DrizzleD1Database,
	userId: number,
	emailReset: boolean
) {
	return await db.update(users).set({ emailReset }).where(eq(users.id, userId)).run();
}

export async function updateUserSiteHints(
	db: DrizzleD1Database,
	userId: number,
	enableSiteHints: boolean
) {
	return await db.update(users).set({ enableSiteHints }).where(eq(users.id, userId)).run();
}

export async function getUsersWithRoleNames(db: DrizzleD1Database) {
	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			normalizedName: users.normalizedName,
			emailReset: users.emailReset,
			createdAt: users.createdAt,
			roleName: roles.name
		})
		.from(users)
		.leftJoin(userRoles, eq(users.id, userRoles.userId))
		.leftJoin(roles, eq(userRoles.roleId, roles.id))
		.all();

	const map = new Map();

	rows.forEach((row) => {
		if (!map.has(row.id)) {
			map.set(row.id, {
				id: row.id,
				name: row.name,
				normalizedName: row.normalizedName,
				emailReset: row.emailReset,
				createdAt: row.createdAt,
				roles: []
			});
		}
		if (row.roleName) {
			map.get(row.id).roles.push(row.roleName);
		}
	});

	return Array.from(map.values());
}

export async function getPermissionsVersionByUserId(db: DrizzleD1Database, userId: number) {
	const result = await db
		.select({ permissionsVersion: users.permissionsVersion })
		.from(users)
		.where(eq(users.id, userId))
		.get();

	return result?.permissionsVersion ?? 1;
}
