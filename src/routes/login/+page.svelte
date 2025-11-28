<script lang="ts">
	import { goto } from '$app/navigation';
	import { linkPublicKey } from '$lib/api/keys';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { getKey, removeDidPrefix } from '$lib/crypto';
	import { toDidableKey } from '$lib/utils/ucan-utils';
	import { CircleAlert, Home } from '@lucide/svelte';

	import { onMount } from 'svelte';

	let token;
	let errorMessage = '';
	let publicKey = '';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		token = params.get('token');

		if (!token) {
			errorMessage = 'Invalid invitation link';
			return;
		}

		try {
			let keypair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;
			const storedPrivateKey = await getKey('privateKey');

			if (storedPrivateKey) {
				keypair = {
					publicKey: (await getKey('publicKey')) as CryptoKey,
					privateKey: storedPrivateKey
				};
			}

			if (!keypair) {
				errorMessage = 'Failed to retrieve keypair';
				return;
			}

			const didableKey = await toDidableKey(keypair);
			publicKey = removeDidPrefix(didableKey.did());

			const { success, error } = await linkPublicKey(token, publicKey);

			if (success) {
				goto('/admin', {
					state: { message: 'You are now signed in to your account from this device.' },
					replaceState: true
				});
			} else {
				errorMessage = error || 'An error occurred';
			}
		} catch (error) {
			console.error('Error posting key:', error);
			errorMessage = 'Key linking failed';
		}
	});
</script>

<div class="flex h-screen items-center justify-center bg-background">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>Login</CardTitle>
			<CardDescription>Processing your login request...</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if errorMessage}
				<Alert variant="destructive">
					<CircleAlert class="h-4 w-4" />
					<AlertDescription>
						{errorMessage}
					</AlertDescription>
				</Alert>
			{/if}
			<Button href="/" class="w-full">
				<Home class="mr-2 h-4 w-4" />
				Go to Home
			</Button>
		</CardContent>
	</Card>
</div>
