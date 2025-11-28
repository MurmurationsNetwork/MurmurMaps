import { loginTokens } from '$lib/server/db/schema';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function isTokenValidAndGetUserId(
	db: DrizzleD1Database,
	token: string
): Promise<number | null> {
	const currentTime = Math.floor(Date.now() / 1000);

	const result = await db
		.select({ userId: loginTokens.userId })
		.from(loginTokens)
		.where(and(eq(loginTokens.token, token), gt(loginTokens.expiresAt, currentTime)))
		.get();

	return result ? result.userId : null;
}

export async function getTokensByUserId(
	db: DrizzleD1Database,
	userId: number
): Promise<{ token: string; expiresAt: number }[]> {
	const currentTime = Math.floor(Date.now() / 1000);

	// Delete expired tokens
	await db
		.delete(loginTokens)
		.where(and(eq(loginTokens.userId, userId), lt(loginTokens.expiresAt, currentTime)))
		.run();

	const result = await db
		.select({ token: loginTokens.token, expiresAt: loginTokens.expiresAt })
		.from(loginTokens)
		.where(eq(loginTokens.userId, userId))
		.orderBy(desc(loginTokens.id))
		.all();

	return result;
}

export async function insertLoginToken(db: DrizzleD1Database, userId: number, token: string) {
	return await db
		.insert(loginTokens)
		.values({ token, userId, expiresAt: sql`(strftime('%s', 'now') + 300)` })
		.returning({ id: loginTokens.id, expiresAt: loginTokens.expiresAt })
		.get();
}

export async function deleteLoginToken(
	db: DrizzleD1Database,
	userId: number,
	token: string
): Promise<boolean> {
	const result = await db
		.delete(loginTokens)
		.where(and(eq(loginTokens.token, token), eq(loginTokens.userId, userId)))
		.returning();
	return result.length > 0;
}
