import { getDB } from '$lib/server/db';
import {
	createSourceIndex,
	getSourceIndexByUrlIncludingDeleted,
	getSourceIndexes,
	restoreSourceIndex
} from '$lib/server/models/source-index';
import type { SourceIndex } from '$lib/types/source-index';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform = { env: { DB: {} as D1Database } } }) => {
	try {
		const db = getDB(platform.env);
		const sourceIndexData = await getSourceIndexes(db);

		const sourceIndexes: SourceIndex[] = sourceIndexData as SourceIndex[];

		return json({ data: sourceIndexes, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { url, label, libraryUrl, dataProxyUrl } = await request.json();

		if (!url || !label || !libraryUrl || !dataProxyUrl) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/source-indexes',
			namespace: 'source-indexes',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const existingSourceIndex = await getSourceIndexByUrlIncludingDeleted(db, url);

		if (existingSourceIndex) {
			await restoreSourceIndex(db, existingSourceIndex.id, {
				url,
				label,
				libraryUrl,
				dataProxyUrl,
				updatedAt: Math.floor(new Date().getTime() / 1000)
			});
			return json({ data: existingSourceIndex, success: true }, { status: 200 });
		}

		const newSourceIndex = await createSourceIndex(db, { url, label, libraryUrl, dataProxyUrl });

		return json({ data: newSourceIndex, success: true }, { status: 201 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
