import { PRIVATE_SERVER_KEY } from '$env/static/private';
import { authenticateRequest } from '$lib/server/auth';
import { getCapabilitiesByIds } from '$lib/server/models/capability';
import { getCapabilityIdsByRoleIds } from '$lib/server/models/role-capability';
import { getPermissionsVersionByUserId } from '$lib/server/models/user';
import { getRoleIdsByUserId } from '$lib/server/models/user-role';
import type { UcanCapability } from '$lib/types/ucan';
import { buildUcanWithCapabilities } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		if (!PRIVATE_SERVER_KEY) {
			return json({ error: 'Server DID is not configured', success: false }, { status: 500 });
		}

		const authResult = await authenticateRequest(platform, request, {
			parseBody: false,
			requiredUserId: true
		});

		if (!authResult.success) {
			return json({ error: authResult.error, success: false }, { status: authResult.status });
		}

		const { userId, xPublicKey, db } = authResult.data;

		if (!userId) {
			return json(
				{ error: 'No account associated with this key', success: false },
				{ status: 200 }
			);
		}

		const roleIds = await getRoleIdsByUserId(db, userId);
		const capabilityIds = await getCapabilityIdsByRoleIds(db, roleIds);
		const capabilities = await getCapabilitiesByIds(db, capabilityIds);
		const permissionsVersion = await getPermissionsVersionByUserId(db, userId);

		const ucanCapabilities: UcanCapability[] = capabilities.map((capability) => ({
			scheme: capability.scheme,
			hierPart: capability.hierPart,
			namespace: capability.namespace,
			segments: [capability.segments]
		}));

		const token = await buildUcanWithCapabilities(
			xPublicKey,
			60 * 60,
			ucanCapabilities,
			permissionsVersion
		);

		return json({ data: { token }, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
