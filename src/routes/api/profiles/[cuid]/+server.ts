import { validateProfile } from '$lib/api/profiles';
import { getDB } from '$lib/server/db';
import { deleteProfile, getProfileByCuid, updateProfile } from '$lib/server/models/profiles';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { getSourceIndexById } from '$lib/server/models/source-index';
import type { ProfileDbUpdateInput, ProfileObject } from '$lib/types/profile';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { cuid } = params;
		if (!cuid) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/profiles/*',
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

		const profile = await getProfileByCuid(db, cuid, userByPublicKey.userId);

		if (!profile) {
			return json({ error: 'Profile not found', success: false }, { status: 404 });
		}

		return json({ data: profile, success: true }, { status: 200 });
	} catch (err) {
		console.error(`Failed to get profile: ${err}`);
		return json(
			{
				error: 'Unable to connect to the database, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { cuid } = params;

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/profiles/*',
			namespace: 'profiles',
			segments: ['PATCH']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const { title, lastUpdated, profile, sourceIndexId } = await request.json();

		if (!cuid || !title || !lastUpdated || !profile || !sourceIndexId) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		const sourceIndex = await getSourceIndexById(db, sourceIndexId);
		if (!sourceIndex) {
			return json({ error: 'Source index not found', success: false }, { status: 404 });
		}

		const validationResult = await validateProfile(
			JSON.parse(profile) as ProfileObject,
			sourceIndex.url
		);
		if (validationResult.errors) {
			return json({ errors: validationResult.errors, success: false }, { status: 422 });
		}

		const profileUpdate: ProfileDbUpdateInput = {
			title,
			lastUpdated: Number(lastUpdated),
			profile,
			updatedAt: Math.floor(new Date().getTime() / 1000),
			sourceIndexId
		};
		const isUpdated = await updateProfile(db, cuid, userByPublicKey.userId, profileUpdate);

		if (isUpdated?.meta?.changes === 0) {
			return json({ error: 'Failed to update profile', success: false }, { status: 404 });
		}

		return json(
			{
				data: {
					cuid,
					title: profileUpdate.title,
					lastUpdated: profileUpdate.lastUpdated,
					profile: profileUpdate.profile,
					updatedAt: profileUpdate.updatedAt
				},
				success: true
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error(`Profile update failed: ${err}`);
		return json(
			{
				error: 'Unable to connect to the database, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { cuid } = params;

		if (!cuid) {
			return json({ error: 'Missing cuid', success: false }, { status: 400 });
		}

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/profiles/*',
			namespace: 'profiles',
			segments: ['DELETE']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const isDeleted = await deleteProfile(db, cuid, userByPublicKey.userId);

		if (isDeleted?.meta?.changes === 0) {
			return json({ error: 'Failed to delete profile', success: false }, { status: 404 });
		}

		return json({ success: true }, { status: 200 });
	} catch (err) {
		console.error(`Profile deletion failed: ${err}`);
		return json(
			{
				error: 'Unable to connect to the database, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};
