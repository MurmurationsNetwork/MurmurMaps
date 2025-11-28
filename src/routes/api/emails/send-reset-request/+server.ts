import { PRIVATE_RESEND_KEY } from '$env/static/private';
import { getDB } from '$lib/server/db';
import { getUserIdByEmail } from '$lib/server/models/email';
import { insertLoginToken } from '$lib/server/models/login-token';
import { getByUserId } from '$lib/server/models/user';
import { generateLoginToken } from '$lib/server/utils';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';

if (!PRIVATE_RESEND_KEY) {
	throw new Error('PRIVATE_RESEND_KEY is not set');
}

const resend = new Resend(PRIVATE_RESEND_KEY);

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const {
			publicKey,
			error: ucanError,
			status
		} = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/emails/send-reset-request',
			namespace: 'emails',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error: ucanError, success: false }, { status });
		}

		const { email } = await request.json();

		if (!email) {
			return json({ error: 'Missing email', success: false }, { status: 400 });
		}

		const userId = await getUserIdByEmail(db, email.toLowerCase());
		if (!userId) {
			return json(
				{ error: 'Email not found or email reset not enabled', success: false },
				{ status: 400 }
			);
		}

		const user = await getByUserId(db, userId);
		if (!user || !user.emailReset) {
			return json(
				{ error: 'Email not found or email reset not enabled', success: false },
				{ status: 400 }
			);
		}

		const token = generateLoginToken();
		const resetLink = new URL(`/login?token=${token}`, request.url).toString();

		const { error } = await resend.emails.send({
			from: 'DONOTREPLY <onboarding@ic3.dev>',
			to: [email],
			subject: 'Account Access Reset',
			html: `<strong>Click the link to reset your account access: <a href="${resetLink}">${resetLink}</a></strong>`
		});

		if (error) {
			return json({ error: 'Failed to send email', success: false }, { status: 500 });
		}

		await insertLoginToken(db, userId, token);

		return json({ data: { email }, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
