import { validateProfile } from '$lib/api/profiles';
import { getDB } from '$lib/server/db';
import { createProfile, getProfilesByUserId } from '$lib/server/models/profiles';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { getSourceIndexById } from '$lib/server/models/source-index';
import type { ProfileInsert, ProfileObject } from '$lib/types/profile';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { createId } from '@paralleldrive/cuid2';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request,
	url
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/profiles',
			namespace: 'profiles',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const sourceIndexId = url.searchParams.get('source_index_id');
		if (!sourceIndexId) {
			return json({ error: 'Missing source_index_id', success: false }, { status: 400 });
		}

		const sourceIndexIdNumber = parseInt(sourceIndexId);
		if (isNaN(sourceIndexIdNumber)) {
			return json({ error: 'Invalid source_index_id', success: false }, { status: 400 });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const profiles = await getProfilesByUserId(db, userByPublicKey.userId, sourceIndexIdNumber);

		return json({ data: profiles, success: true });
	} catch (err) {
		console.error(`Failed to fetch profiles: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/profiles',
			namespace: 'profiles',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const { linkedSchemas, title, profile, nodeId, lastUpdated, sourceIndexId } =
			await request.json();

		if (!linkedSchemas || !title || !profile || !lastUpdated || !sourceIndexId) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		const sourceIndex = await getSourceIndexById(db, sourceIndexId);
		if (!sourceIndex) {
			return json({ error: 'Source index not found', success: false }, { status: 404 });
		}

		// Validate profile
		const validationResult = await validateProfile(
			JSON.parse(profile) as ProfileObject,
			sourceIndex.url
		);
		if (validationResult.errors) {
			return json({ errors: validationResult.errors, success: false }, { status: 422 });
		}

		const cuid = createId();
		const profileInsert: ProfileInsert = {
			cuid,
			userId: userByPublicKey.userId,
			lastUpdated,
			linkedSchemas,
			title,
			profile,
			nodeId,
			sourceIndexId
		};

		await createProfile(db, profileInsert);

		return json({ data: profileInsert, success: true }, { status: 201 });
	} catch (err) {
		console.error(`Profile save failed: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
