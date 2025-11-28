import { sourceIndexes } from '$lib/server/db/schema';
import type { SourceIndexDbUpdateInput, SourceIndexInsert } from '$lib/types/source-index';
import { and, eq, isNull } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getSourceIndexes(db: DrizzleD1Database) {
	return await db.select().from(sourceIndexes).where(isNull(sourceIndexes.deletedAt)).all();
}

export async function getSourceIndexById(db: DrizzleD1Database, id: number) {
	return await db
		.select()
		.from(sourceIndexes)
		.where(and(eq(sourceIndexes.id, id), isNull(sourceIndexes.deletedAt)))
		.get();
}

export async function getSourceIndexByUrl(db: DrizzleD1Database, url: string) {
	return await db
		.select()
		.from(sourceIndexes)
		.where(and(eq(sourceIndexes.url, url), isNull(sourceIndexes.deletedAt)))
		.get();
}

export async function getSourceIndexByUrlIncludingDeleted(db: DrizzleD1Database, url: string) {
	return await db.select().from(sourceIndexes).where(eq(sourceIndexes.url, url)).get();
}

export async function createSourceIndex(db: DrizzleD1Database, data: SourceIndexInsert) {
	return await db.insert(sourceIndexes).values(data).run();
}

export async function updateSourceIndex(
	db: DrizzleD1Database,
	id: number,
	data: SourceIndexDbUpdateInput
) {
	return await db
		.update(sourceIndexes)
		.set(data)
		.where(and(eq(sourceIndexes.id, id), isNull(sourceIndexes.deletedAt)))
		.run();
}

export async function restoreSourceIndex(
	db: DrizzleD1Database,
	id: number,
	data: SourceIndexDbUpdateInput
) {
	return await db
		.update(sourceIndexes)
		.set({ ...data, deletedAt: null })
		.where(eq(sourceIndexes.id, id))
		.run();
}

export async function deleteSourceIndex(db: DrizzleD1Database, id: number) {
	return await db
		.update(sourceIndexes)
		.set({ deletedAt: Math.floor(new Date().getTime() / 1000) })
		.where(eq(sourceIndexes.id, id))
		.run();
}
