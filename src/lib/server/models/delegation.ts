import { delegations } from '$lib/server/db/schema';
import type { DelegationInsert } from '$lib/types/delegation';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function createDelegations(db: DrizzleD1Database, delegationList: DelegationInsert[]) {
	return await db.insert(delegations).values(delegationList).returning();
}
