import { sourceIndexes } from '$lib/server/db/schema';

export type SourceIndex = typeof sourceIndexes.$inferSelect;

export type SourceIndexInsert = typeof sourceIndexes.$inferInsert;

export type SourceIndexCreateInput = Omit<SourceIndexInsert, 'id' | 'createdAt' | 'updatedAt'>;

export type SourceIndexUpdateInput = Pick<
	SourceIndex,
	'url' | 'label' | 'libraryUrl' | 'dataProxyUrl'
>;

export type SourceIndexDbUpdateInput = Pick<
	SourceIndex,
	'url' | 'label' | 'libraryUrl' | 'dataProxyUrl' | 'updatedAt'
>;
