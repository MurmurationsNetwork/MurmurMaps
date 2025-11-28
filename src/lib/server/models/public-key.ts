import { publicKeys } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getUserIdByPublicKey(db: DrizzleD1Database, publicKey: string) {
	return await db
		.select({ userId: publicKeys.userId })
		.from(publicKeys)
		.where(eq(publicKeys.publicKey, publicKey))
		.get();
}

export async function getPublicKeysByUserId(db: DrizzleD1Database, userId: number) {
	return await db
		.select({ publicKey: publicKeys.publicKey })
		.from(publicKeys)
		.where(eq(publicKeys.userId, userId))
		.all();
}

export async function insertPublicKey(db: DrizzleD1Database, userId: number, publicKey: string) {
	return await db
		.insert(publicKeys)
		.values({ userId, publicKey })
		.returning({ id: publicKeys.id })
		.get();
}

export async function deletePublicKey(
	db: DrizzleD1Database,
	userId: number,
	publicKey: string
): Promise<boolean> {
	const result = await db
		.delete(publicKeys)
		.where(and(eq(publicKeys.userId, userId), eq(publicKeys.publicKey, publicKey)))
		.returning();

	return result.length > 0;
}
