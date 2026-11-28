import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PRIVATE_SERVER_KEY: { static: true },
	PUBLIC_TOOLS_URL: { public: true, static: true },
	PRIVATE_RESEND_KEY: { static: true },
	PUBLIC_SERVER_DID_KEY: { public: true, static: true }
});
