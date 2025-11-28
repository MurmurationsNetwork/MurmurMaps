import { nodes } from '$lib/server/db/schema';
import type { NodeDbUpdateInput, NodeInsert } from '$lib/types/node';
import type { Node } from '$lib/types/node';
import type { D1Result } from '@cloudflare/workers-types';
import { and, count, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getNodes(db: DrizzleD1Database, clusterUuid: string) {
	return await db.select().from(nodes).where(eq(nodes.clusterUuid, clusterUuid)).all();
}

export async function getPublishedNodes(
	db: DrizzleD1Database,
	clusterUuid: string,
	limit: number,
	offset: number,
	nameSearch?: string,
	tagsSearch?: string,
	sort?: 'name-asc' | 'name-desc',
	enumFilters?: Record<string, string>
) {
	const whereClause = buildSearchCondition(clusterUuid, nameSearch, tagsSearch, enumFilters);

	let query;
	if (sort === 'name-asc') {
		query = db
			.select()
			.from(nodes)
			.where(whereClause)
			.orderBy(sql`LOWER(json_extract(${nodes.data}, '$.name')) ASC`);
	} else if (sort === 'name-desc') {
		query = db
			.select()
			.from(nodes)
			.where(whereClause)
			.orderBy(sql`LOWER(json_extract(${nodes.data}, '$.name')) DESC`);
	} else {
		query = db.select().from(nodes).where(whereClause);
	}

	return await query.limit(limit).offset(offset).all();
}
export async function getPublishedMapNodes(
	db: DrizzleD1Database,
	clusterUuid: string,
	nameSearch?: string,
	tagsSearch?: string,
	enumFilters?: Record<string, string>
) {
	const whereClause = and(
		buildSearchCondition(clusterUuid, nameSearch, tagsSearch, enumFilters),
		sql`json_extract(${nodes.data}, '$.geolocation.lat') IS NOT NULL`,
		sql`json_extract(${nodes.data}, '$.geolocation.lon') IS NOT NULL`
	);

	return await db.select().from(nodes).where(whereClause).all();
}

export async function getPublishedNodeCount(
	db: DrizzleD1Database,
	clusterUuid: string,
	nameSearch?: string,
	tagsSearch?: string,
	enumFilters?: Record<string, string>
) {
	const whereClause = buildSearchCondition(clusterUuid, nameSearch, tagsSearch, enumFilters);

	const result = await db.select({ count: count() }).from(nodes).where(whereClause).get();

	return result?.count ?? 0;
}

export async function getNode(db: DrizzleD1Database, clusterUuid: string, profileUrl: string) {
	return await db
		.select()
		.from(nodes)
		.where(and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.profileUrl, profileUrl)))
		.limit(1);
}

export async function getPublishedNodeById(
	db: DrizzleD1Database,
	clusterUuid: string,
	nodeId: number
) {
	return await db
		.select()
		.from(nodes)
		.where(
			and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.id, nodeId), eq(nodes.status, 'published'))
		)
		.limit(1);
}

export async function getNodeById(db: DrizzleD1Database, clusterUuid: string, nodeId: number) {
	return await db
		.select()
		.from(nodes)
		.where(and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.id, nodeId)))
		.limit(1);
}

export async function getDistinctLinkedSchemas(
	db: DrizzleD1Database,
	clusterUuid: string
): Promise<string[]> {
	const result = await db
		.select({ schema: sql`DISTINCT json_each.value` })
		.from(sql`nodes, json_each(json_extract(nodes.data, '$.linked_schemas'))`)
		.where(eq(nodes.clusterUuid, clusterUuid))
		.all();

	return result.map((row) => row.schema as string);
}

export async function createNode(db: DrizzleD1Database, node: NodeInsert): Promise<Node> {
	const result = await db.insert(nodes).values(node).returning().run();
	return result.results[0] as Node;
}

export async function updateNode(
	db: DrizzleD1Database,
	clusterUuid: string,
	nodeId: number,
	node: NodeDbUpdateInput
): Promise<Node> {
	const result = await db
		.update(nodes)
		.set(node)
		.where(and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.id, nodeId)))
		.returning()
		.run();
	return result.results[0] as Node;
}

export async function deleteNodes(db: DrizzleD1Database, clusterUuid: string): Promise<D1Result> {
	return await db.delete(nodes).where(eq(nodes.clusterUuid, clusterUuid)).run();
}

export async function deleteNode(
	db: DrizzleD1Database,
	clusterUuid: string,
	nodeId: number
): Promise<D1Result> {
	return await db
		.delete(nodes)
		.where(and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.id, nodeId)))
		.run();
}

function buildSearchCondition(
	clusterUuid: string,
	nameSearch?: string,
	tagsSearch?: string,
	enumFilters?: Record<string, string>
) {
	const baseCondition = and(
		eq(nodes.clusterUuid, clusterUuid),
		eq(nodes.isAvailable, 1),
		eq(nodes.status, 'published')
	);

	const conditions = [baseCondition];

	if (nameSearch) {
		const name = nameSearch.trim().toLowerCase();
		if (name.length > 0) {
			conditions.push(sql`LOWER(json_extract(${nodes.data}, '$.name')) LIKE ${'%' + name + '%'}`);
		}
	}

	// Tags search, all tags must match
	if (tagsSearch) {
		const tags = tagsSearch
			.split(',')
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag) => tag.length > 0);
		if (tags.length > 0) {
			conditions.push(
				...tags.map(
					(tag) =>
						sql`EXISTS (
					SELECT 1 FROM json_each(json_extract(${nodes.data}, '$.tags'))
					WHERE LOWER(json_each.value) = ${tag}
				)`
				)
			);
		}
	}

	if (enumFilters) {
		for (const [field, value] of Object.entries(enumFilters)) {
			const jsonPath = `$.${field}`;
			// Generally, the value in data's JSON is a string, but it might be an array, so we need to check if the value exists in the array
			conditions.push(
				sql`(
					EXISTS (
						SELECT 1 FROM json_each(json_extract(${nodes.data}, ${jsonPath}))
						WHERE json_each.value = ${value}
					)
					OR
					json_extract(${nodes.data}, ${jsonPath}) = ${value}
				)`
			);
		}
	}

	return and(...conditions);
}

// Get Job Result
export async function getProfileListFromJobResult(
	db: DrizzleD1Database,
	clusterUuid: string,
	jobUuid: string
) {
	return await db
		.select()
		.from(nodes)
		.where(
			and(
				eq(nodes.clusterUuid, clusterUuid),
				eq(nodes.lastUpdateJobUuid, jobUuid),
				eq(nodes.isDeleted, 0)
			)
		)
		.all();
}

export async function getDeletedProfilesFromJobResult(
	db: DrizzleD1Database,
	clusterUuid: string,
	jobUuid: string
) {
	return await db
		.select()
		.from(nodes)
		.where(
			and(
				eq(nodes.clusterUuid, clusterUuid),
				eq(nodes.lastUpdateJobUuid, jobUuid),
				eq(nodes.isDeleted, 1)
			)
		)
		.all();
}

export async function getUnauthoritativeProfilesFromJobResult(
	db: DrizzleD1Database,
	clusterUuid: string,
	jobUuid: string
) {
	return await db
		.select()
		.from(nodes)
		.where(
			and(
				eq(nodes.clusterUuid, clusterUuid),
				eq(nodes.lastAuthorityChangeJobUuid, jobUuid),
				eq(nodes.hasAuthority, 0)
			)
		)
		.all();
}

export async function cleanDeletedNodes(
	db: DrizzleD1Database,
	clusterUuid: string
): Promise<D1Result> {
	return await db
		.delete(nodes)
		.where(and(eq(nodes.clusterUuid, clusterUuid), eq(nodes.isDeleted, 1)))
		.run();
}
