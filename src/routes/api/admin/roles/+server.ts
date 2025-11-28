import { getDB } from '$lib/server/db';
import { createRole, getRoles } from '$lib/server/models/role';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/admin/roles',
			namespace: 'admin-roles',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const allRoles = await getRoles(db);

		return json({ data: allRoles, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error fetching roles:', error);
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
			hierPart: '/users',
			namespace: 'users',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const { name, description } = await request.json();

		if (
			!name ||
			typeof name !== 'string' ||
			!name.trim() ||
			!description ||
			typeof description !== 'string' ||
			!description.trim()
		) {
			return json(
				{ error: 'Role name and description are required', success: false },
				{ status: 400 }
			);
		}

		// Check if role with this name already exists
		const existingRoles = await getRoles(db);
		const roleExists = existingRoles.some(
			(role) => role.name.toLowerCase() === name.trim().toLowerCase()
		);

		if (roleExists) {
			return json({ error: 'Role with this name already exists', success: false }, { status: 409 });
		}

		await createRole(db, {
			name: name.trim(),
			description: description?.trim() || null
		});

		return json({ success: true }, { status: 201 });
	} catch (error) {
		console.error('Error creating role:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
