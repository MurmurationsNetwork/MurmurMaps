import { delegations } from '#lib/server/db/schema.ts';
import type { DelegationInsert } from '#lib/types/delegation.d.ts';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function createDelegations(db: DrizzleD1Database, delegationList: DelegationInsert[]) {
	return await db.insert(delegations).values(delegationList).returning();
}
