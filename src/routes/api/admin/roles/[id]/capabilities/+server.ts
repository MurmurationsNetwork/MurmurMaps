import { getDB } from '$lib/server/db';
import {
	getCapabilityIdsByRoleId,
	updateRoleCapabilities
} from '$lib/server/models/role-capability';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
	request
}) => {
	const userId = params.id;

	if (!userId) {
		return json({ error: 'User ID is required', success: false }, { status: 400 });
	}

	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/admin/roles/*/capabilities',
			namespace: 'admin-roles',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const roleIds = await getCapabilityIdsByRoleId(db, Number(userId));

		return json(
			{
				data: roleIds,
				success: true
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching user role:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request,
	params
}) => {
	const roleId = params.id;

	if (!roleId) {
		return json({ error: 'Role ID is required', success: false }, { status: 400 });
	}

	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/admin/roles/*/capabilities',
			namespace: 'admin-roles',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const { capability_ids } = await request.json();

		if (!Array.isArray(capability_ids)) {
			return json({ error: 'capability_ids must be an array', success: false }, { status: 400 });
		}

		await updateRoleCapabilities(db, Number(roleId), capability_ids);

		return json(
			{
				success: true
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error updating role capabilities:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
