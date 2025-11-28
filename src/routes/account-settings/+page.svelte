<script lang="ts">
	import { page } from '$app/state';
	import { addEmail, deleteEmail, getEmails } from '$lib/api/emails';
	import { deletePublicKey, getPublicKeys } from '$lib/api/keys';
	import { createToken, deleteToken, getTokens } from '$lib/api/tokens';
	import { resetEmail, updateSiteHints } from '$lib/api/users';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { userStore } from '$lib/stores/user-store';
	import type { PageLoginToken } from '$lib/types/token';
	import type { User } from '$lib/types/user';
	import { isValidEmail } from '$lib/utils/validators';
	import type { Page } from '@sveltejs/kit';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	interface CustomPageState extends Page {
		state: {
			message?: string;
		};
	}

	let typedPage = page as unknown as CustomPageState;

	type KnownErrors = 'UNSUPPORTED_ALGORITHM' | 'UNKNOWN';

	function parseError(error: unknown): { type: KnownErrors; message: string } {
		if (typeof error === 'string' && error.includes('Algorithm: Unrecognized name')) {
			return {
				type: 'UNSUPPORTED_ALGORITHM',
				message:
					'Your browser does not support Ed25519 by default. Please enable "Experimental Web Platform features" in chrome://flags or use Firefox/Safari instead.'
			};
		}
		return { type: 'UNKNOWN', message: String(error) };
	}

	let email = $state('');
	let validEmail = $derived(isValidEmail(email));
	let emailList = $state<string[]>([]);
	let currentPublicKey = $state<string>('');
	let publicKeyList = $state<string[]>([]);
	let errorMessage = $state('');
	let tokens = $state<PageLoginToken[]>([]);
	let isGeneratingLink = $state(false);
	let currentUser: User | null = $state(null);
	let emailResetEnabled = $state(false);
	let isLoading = $state(true);
	let siteHintsEnabled = $state(false);

	userStore.subscribe((user) => {
		currentUser = user;
		emailResetEnabled = currentUser ? currentUser.emailReset : false;
		siteHintsEnabled = currentUser ? currentUser.enableSiteHints : true;
	});

	async function handleAddEmail() {
		if (!email) return;
		if (!isValidEmail(email)) {
			toast.error('Invalid email address');
			return;
		}
		try {
			const { success, error } = await addEmail(email);
			if (success) {
				emailList = [...emailList, email];
				email = '';
				errorMessage = '';
				toast.success('Email address added successfully');
			} else {
				toast.error(error || 'Failed to add email.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred: ' + parsed.message);
			}
		}
	}

	async function removeEmail(index: number) {
		try {
			const emailToRemove = emailList[index];
			const { success, error, data } = await deleteEmail(emailToRemove);
			if (success) {
				emailList = emailList.filter((_, i) => i !== index);
				errorMessage = '';
				const previousEmailResetEnabled = emailResetEnabled;
				emailResetEnabled = data?.emailReset ?? false;
				if (previousEmailResetEnabled !== emailResetEnabled) {
					toast.success(
						`Email address removed successfully. Email reset is now ${emailResetEnabled ? 'enabled' : 'disabled'}.`
					);
				} else {
					toast.success('Email address removed successfully');
				}
			} else {
				toast.error(error || 'Failed to remove email.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred while removing email: ' + parsed.message);
			}
		}
	}

	async function generateLink() {
		isGeneratingLink = true;

		try {
			const { data, success } = await createToken();
			if (success) {
				tokens = [
					{
						token: data.token,
						expiresAt: data.expiresAt,
						expiresIn: Math.max(0, Math.floor((data.expiresAt * 1000 - Date.now()) / 1000))
					},
					...tokens
				];
				toast.success(
					'A token was generated. Copy the link and open it in a browser on another device to access your account.'
				);
			} else {
				toast.error('Failed to generate token.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred: ' + parsed.message);
			}
		} finally {
			isGeneratingLink = false;
		}
	}

	async function handleDeleteToken(token: string) {
		try {
			const { success, error } = await deleteToken(token);
			if (success) {
				tokens = tokens.filter((t) => t.token !== token);
				toast.success('The login token has been deleted.');
			} else {
				toast.error(error || 'Failed to delete token.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred while deleting token: ' + parsed.message);
			}
		}
	}

	function copyLinkToClipboard(token: string) {
		navigator.clipboard.writeText(`${window.location.origin}/login?token=${token}`).then(() => {
			toast.success('Link copied!');
		});
	}

	async function handleDeletePublicKey(publicKey: string) {
		try {
			const { success, error } = await deletePublicKey(publicKey);
			if (success) {
				publicKeyList = publicKeyList.filter((key) => key !== publicKey);
				toast.success('The public key has been deleted.');
			} else {
				toast.error(error || 'Failed to delete public key.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred while deleting public key: ' + parsed.message);
			}
		}
	}

	async function toggleEmailReset(checked: boolean) {
		try {
			const { success, error } = await resetEmail(checked);
			if (success) {
				emailResetEnabled = checked;
				toast.success(checked ? 'Email reset enabled' : 'Email reset disabled');
			} else {
				toast.error(error || 'Failed to update email reset setting.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error(
					'An unexpected error occurred while updating email reset setting: ' + parsed.message
				);
			}
		}
	}

	async function toggleSiteHints(checked: boolean) {
		try {
			const { success, error } = await updateSiteHints(checked);
			if (success) {
				siteHintsEnabled = checked;
				userStore.set({ ...currentUser, enableSiteHints: checked } as User);
				toast.success(checked ? 'Site hints enabled' : 'Site hints disabled');
			} else {
				toast.error(error || 'Failed to update site hints setting.');
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error(
					'An unexpected error occurred while updating site hints setting: ' + parsed.message
				);
			}
		}
	}

	onMount(async () => {
		try {
			const [emailsResult, keysResult, tokensResult] = await Promise.all([
				getEmails(),
				getPublicKeys(),
				getTokens()
			]);

			if (emailsResult.success) {
				emailList = emailsResult.data?.map((item: { email: string }) => item.email) || [];
			} else {
				toast.error('Failed to fetch email: ' + emailsResult.error);
			}

			if (keysResult.success) {
				publicKeyList =
					keysResult.data?.publicKeys?.map((item: { publicKey: string }) => item.publicKey) || [];
				currentPublicKey = keysResult.data?.currentPublicKey || '';
			} else {
				toast.error('Failed to fetch keys: ' + keysResult.error);
			}

			if (tokensResult.success) {
				tokens = tokensResult?.data?.map((item: { token: string; expiresAt: number }) => {
					return {
						token: item.token,
						expiresAt: item.expiresAt,
						expiresIn: Math.max(0, Math.floor((item.expiresAt * 1000 - Date.now()) / 1000))
					};
				});
				startTokenCountdown();
			} else {
				toast.error('Failed to fetch tokens: ' + tokensResult.error);
			}
		} catch (error) {
			const parsed = parseError(error);
			if (parsed.type === 'UNSUPPORTED_ALGORITHM') {
				errorMessage = parsed.message;
			} else {
				toast.error('An unexpected error occurred: ' + parsed.message);
			}
		} finally {
			isLoading = false;
		}
	});

	function startTokenCountdown() {
		setInterval(() => {
			tokens = tokens.map((token) => {
				return {
					...token,
					expiresIn: Math.max(0, Math.floor((token.expiresAt * 1000 - Date.now()) / 1000))
				};
			});
		}, 1000);
	}
</script>

<div class="container mx-auto p-4">
	{#if typedPage?.state?.message}
		<Alert
			class="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
		>
			<AlertDescription>{typedPage.state.message}</AlertDescription>
		</Alert>
	{/if}

	{#if errorMessage}
		<Alert variant="destructive">
			<AlertDescription>
				{#if errorMessage && errorMessage.includes('Algorithm: Unrecognized name')}
					<div class="space-y-4">
						<div>
							Chrome and Chromium browsers do not support the Ed25519 algorithm by default. Here's
							how to enable it:
						</div>
						<ol class="list-decimal pl-4 space-y-1">
							<li>
								Open a new browser window and type <code class="font-mono">chrome://flags</code> in the
								address bar and press Enter.
							</li>
							<li>
								In the search box at the top of the <code class="font-mono">chrome://flags</code> page,
								type "Experimental Web Platform features".
							</li>
							<li>Find the "Experimental Web Platform features" flag.</li>
							<li>Click the dropdown menu next to it and select "Enabled".</li>
							<li>After enabling the flag, you will be prompted to restart the browser.</li>
							<li>Click "Relaunch" to restart and try loading this page again.</li>
						</ol>
						<p>
							<strong
								>Or you can simply just use Firefox (Windows, Linux, Apple) or Safari (Apple)
								instead.</strong
							>
						</p>
					</div>
				{:else}
					{errorMessage}
				{/if}
			</AlertDescription>
		</Alert>
	{/if}

	{#if isLoading}
		<div class="flex justify-center items-center py-8">
			<div class="text-muted-foreground">Loading...</div>
		</div>
	{:else if !currentUser}
		{#if !errorMessage.includes('Algorithm: Unrecognized name')}
			<Card>
				<CardHeader>
					<CardTitle>Welcome to the Murmurations Collaborative Cluster Builder</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p>
						When you loaded this website, a public/private key pair was generated and stored safely
						in your browser. You can use this key pair to identify yourself here.
					</p>
					<p>Click the button below to create an account.</p>
					<Button>
						<a href="/register">Register</a>
					</Button>
				</CardContent>
			</Card>
		{/if}
	{:else}
		<div class="space-y-8">
			<!-- Public Keys Section -->
			<Card>
				<CardHeader>
					<CardTitle>{publicKeyList.length > 1 ? 'Your Public Keys' : 'Your Public Key'}</CardTitle>
					<CardDescription>
						{#if publicKeyList.length > 1}
							These are your public keys. You can disassociate keys from your other devices by
							deleting them, except for the key pair on this device.
						{:else}
							This is your public key. You can add other public keys to enable access to your
							account from other devices.
						{/if}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#each publicKeyList as publicKey, index (publicKey)}
							<div class="space-y-4">
								<div class="flex items-center justify-between gap-4">
									<div class="font-mono text-sm break-all flex-1">
										did:key:z{publicKey}
									</div>
									{#if publicKey !== currentPublicKey}
										<Button variant="destructive" onclick={() => handleDeletePublicKey(publicKey)}>
											Delete
										</Button>
									{:else}
										<Badge variant="secondary">Current</Badge>
									{/if}
								</div>
								{#if index < publicKeyList.length - 1}
									<hr class="border-border" />
								{/if}
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>

			<!-- Login Tokens Section -->
			<Card>
				<CardHeader>
					<CardTitle>{tokens.length > 1 ? 'Login Tokens' : 'Login Token'}</CardTitle>
					<CardDescription>
						Generate a login token to sign in to your account from another device.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#if tokens.length === 0}
							<p class="text-muted-foreground">No token available.</p>
						{:else}
							<div class="space-y-4">
								{#each tokens as { token, expiresIn }, index (token)}
									<div class="space-y-4">
										<div class="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_auto]">
											<div class="space-y-1">
												<div class="flex items-center">
													<span class="text-sm font-medium">Token:</span>
													<span class="ml-2 font-mono text-sm truncate">{token}</span>
												</div>
												<div class="flex items-center">
													{#if expiresIn > 0}
														<span class="text-sm font-medium"
															>Expires in: <span class="font-normal">{expiresIn} seconds</span
															></span
														>
													{:else}
														<Badge variant="destructive">Expired</Badge>
													{/if}
												</div>
											</div>
											<div class="flex flex-col gap-2 sm:flex-row">
												{#if expiresIn > 0}
													<Button variant="outline" onclick={() => copyLinkToClipboard(token)}>
														Copy Link
													</Button>
												{/if}
												<Button variant="destructive" onclick={() => handleDeleteToken(token)}>
													Delete Token
												</Button>
											</div>
										</div>
										{#if index < tokens.length - 1}
											<hr class="border-border" />
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						{#if tokens.length === 0}
							<Button onclick={generateLink} disabled={isGeneratingLink}>
								{isGeneratingLink ? 'Generating...' : 'Generate Login Token'}
							</Button>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Email Section -->
			<Card>
				<CardHeader>
					<CardTitle>Your Email</CardTitle>
					<CardDescription>
						{#if publicKeyList.length > 1}
							Add an email address to reset access to your account if you accidentally erase all of
							your key pairs from your devices.
						{:else}
							Add an email address to reset access to your account if you accidentally erase your
							key pair from this device.
						{/if}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#if emailList.length === 0}
							<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
								<div class="flex-1 space-y-2">
									<Label for="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										bind:value={email}
										placeholder="Enter your email"
									/>
									{#if email && !validEmail}
										<p class="text-sm text-destructive">Invalid email format</p>
									{/if}
									<Button onclick={handleAddEmail} disabled={!validEmail}>Add Email</Button>
								</div>
							</div>
						{:else}
							<div class="space-y-2">
								{#each emailList as email, index (email)}
									<div class="flex items-center justify-between p-3 border rounded-lg">
										<span class="text-sm">{email}</span>
										<Button variant="destructive" size="sm" onclick={() => removeEmail(index)}>
											Delete
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Email Reset Toggle -->
			<Card>
				<CardHeader>
					<CardTitle>Email Reset Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="flex items-center space-x-2">
							<Switch
								id="email-reset"
								checked={emailResetEnabled}
								onCheckedChange={toggleEmailReset}
							/>
							<Label for="email-reset">Enable Email Reset</Label>
						</div>
						<p class="text-sm text-muted-foreground">
							Use this link to test resetting your email:
							<a class="text-primary hover:underline" href="{window.location.origin}/admin/email">
								{window.location.origin}/admin/email
							</a>
						</p>
					</div>
				</CardContent>
			</Card>

			<!-- Site Hints Settings -->
			<Card>
				<CardHeader>
					<CardTitle>Site Hints Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="flex items-center space-x-2">
							<Switch
								id="site-hints"
								checked={siteHintsEnabled}
								onCheckedChange={toggleSiteHints}
							/>
							<Label for="site-hints">Enable Site Hints</Label>
						</div>
						<p class="text-sm text-muted-foreground">
							When enabled, the site will provide helpful hints and tips to improve your experience.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
