import { authenticateRequest } from '#lib/server/auth.ts';
import { getCapabilitiesByIds } from '#lib/server/models/capability.ts';
import { getUserIdByPublicKey, insertPublicKey } from '#lib/server/models/public-key.ts';
import { getCapabilityIdsByRoleIds } from '#lib/server/models/role-capability.ts';
import { getRoleIdsByUserId, insertUserRole } from '#lib/server/models/user-role.ts';
import { doesNameExist, getUserIdByName, insertUser } from '#lib/server/models/user.ts';
import type { UcanCapability } from '#lib/types/ucan.d.ts';
import { buildUcanWithCapabilities } from '#lib/utils/ucan-utils.server.ts';
import { PRIVATE_SERVER_KEY } from '$app/env/private';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!PRIVATE_SERVER_KEY) {
			return json({ error: 'Server DID is not configured', success: false }, { status: 500 });
		}

		const authResult = await authenticateRequest(request, {
			parseBody: true,
			requiredUserId: false
		});

		if (!authResult.success) {
			return json({ error: authResult.error, success: false }, { status: authResult.status });
		}

		const { db, xPublicKey, body } = authResult.data;
		const { name } = body as { name: string };

		if (!name) {
			return json({ error: 'Missing username', success: false }, { status: 400 });
		}

		const alphanumericRegex = /^[a-zA-Z0-9]+$/;

		if (!alphanumericRegex.test(name)) {
			return json({ error: 'Username must be alphanumeric', success: false }, { status: 400 });
		}

		const nameExists = await doesNameExist(db, name);

		if (nameExists) {
			return json(
				{ error: 'Username already exists, please choose another username', success: false },
				{ status: 403 }
			);
		}

		const [userIdByName, userIdByPublicKey] = await Promise.all([
			getUserIdByName(db, name),
			getUserIdByPublicKey(db, xPublicKey)
		]);

		if (userIdByName) {
			if (userIdByPublicKey?.userId === userIdByName.id) {
				return json({ data: { public_key: xPublicKey }, success: true }, { status: 200 });
			}
			return json({ error: 'User already exists', success: false }, { status: 403 });
		}

		if (userIdByPublicKey) {
			return json(
				{
					error:
						'A Public Key already exists for this browser, if you visit the home page you should be automatically logged in. If not, delete the Public Key for this browser and create a new one.',
					success: false
				},
				{ status: 403 }
			);
		}

		const insertedUser = await insertUser(db, name);
		await insertPublicKey(db, insertedUser.id, xPublicKey);

		// Insert default role for user
		await insertUserRole(db, insertedUser.id, 'User');

		// Get capabilities for user
		const roleIds = await getRoleIdsByUserId(db, insertedUser.id);
		const capabilityIds = await getCapabilityIdsByRoleIds(db, roleIds);
		const capabilities = await getCapabilitiesByIds(db, capabilityIds);

		const ucanCapabilities: UcanCapability[] = capabilities.map((capability) => ({
			scheme: capability.scheme,
			hierPart: capability.hierPart,
			namespace: capability.namespace,
			segments: [capability.segments]
		}));

		const token = await buildUcanWithCapabilities(xPublicKey, 10 * 60, ucanCapabilities, 1);

		return json({ data: { token }, success: true }, { status: 201 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
