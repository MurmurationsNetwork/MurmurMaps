<script lang="ts">
	import { goto } from '$app/navigation';
	import { register } from '$lib/api/auth-request';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { storeToken } from '$lib/core';
	import { exportPublicKey, getOrCreateKeyPair, signRequest } from '$lib/crypto';
	import { rootTokenStore } from '$lib/stores/token-store';
	import { currentTokenStore } from '$lib/stores/token-store';
	import type { CryptoKeyPair } from '$lib/types/crypto';
	import { issueAccessUcan } from '$lib/utils/ucan-utils';
	import { CircleAlert } from '@lucide/svelte';

	import { onMount } from 'svelte';

	let { form } = $props();

	let name = $state('');
	let isSubmitting = $state(false);
	let keypair: CryptoKeyPair | null = $state(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		keypair = await getOrCreateKeyPair();
	});

	async function handleRegister(event: Event) {
		event.preventDefault();

		if (!keypair || !name.trim()) return;

		isSubmitting = true;
		error = null;

		try {
			const body = { name };
			const requestBody = JSON.stringify(body);
			const xTimer = Math.floor(Date.now());
			const signature = await signRequest(requestBody, keypair.privateKey);
			const xTimerSignature = await signRequest(xTimer.toString(), keypair.privateKey);
			const publicKey = await exportPublicKey(keypair.publicKey);

			const {
				data,
				success,
				error: registerError
			} = await register(name, signature, xTimer.toString(), xTimerSignature, publicKey);

			if (!success || !data?.token) {
				error = registerError || 'Registration failed';
				return;
			}

			await storeToken('rootToken', data.token);

			const accessUcan = await issueAccessUcan(data.token, keypair, 60 * 60);
			await storeToken('currentToken', accessUcan);

			rootTokenStore.set(data.token);
			currentTokenStore.set(accessUcan);

			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex h-screen items-center justify-center bg-background">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>Register</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if form?.error || error}
				<Alert variant="destructive">
					<CircleAlert class="h-4 w-4" />
					<AlertDescription>
						{form?.error || error}
					</AlertDescription>
				</Alert>
			{/if}

			<form onsubmit={handleRegister}>
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Username</Label>
						<Input
							class="mt-2"
							id="name"
							name="name"
							type="text"
							placeholder="Enter a username to identify you on this website"
							bind:value={name}
							disabled={isSubmitting}
							required
						/>
					</div>

					<Alert
						class="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
					>
						<AlertDescription>
							<Accordion.Root type="single">
								<Accordion.Item value="item-1" class="border-none">
									<Accordion.Trigger>Why don't I need to enter a password?</Accordion.Trigger>
									<Accordion.Content>
										When you loaded this website, a <a
											href="https://en.wikipedia.org/wiki/Public-key_cryptography"
											target="_blank"
											class="text-primary hover:text-primary/80 underline"
											>public/private key pair</a
										> was generated and stored safely in your browser. This key pair will be used to
										automatically identify you here, and is much more secure than a password. Just enter
										a username and click the button to create an account.
									</Accordion.Content>
								</Accordion.Item>
								<Accordion.Item value="item-2" class="border-none">
									<Accordion.Trigger
										>How can I access my account from another device?</Accordion.Trigger
									>
									<Accordion.Content>
										Select <b>Account > Account Settings</b> from the menu and then click the
										<b>Generate Login Token</b> button. Copy the link and open it in a browser on another
										device to access your account.
									</Accordion.Content>
								</Accordion.Item>
							</Accordion.Root>
						</AlertDescription>
					</Alert>

					<Button class="w-full" type="submit" disabled={isSubmitting || !name.trim() || !keypair}>
						{isSubmitting ? 'Creating Account...' : 'Create Account'}
					</Button>
				</div>
			</form>

			<Button href="/" class="w-full" variant="outline">Cancel</Button>
		</CardContent>
	</Card>
</div>
