<script lang="ts">
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getToken } from '$lib/core';
	import { getKey } from '$lib/crypto';
	import { toDidableKey } from '$lib/utils/ucan-utils';
	import * as ucans from '@ucans/ucans';

	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	let ucanToken = $state('');
	let parsedCapabilities: ucans.Capability[] = $state([]);
	let selectedCapabilities: ucans.Capability[] = $state([]);
	let recipientPublicKey = $state('');
	let isGenerating = $state(false);
	let generatedDelegation: string | null = $state(null);
	let keypair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = $state(null);
	let myDidKey = $state('');

	let isAllSelected = $derived(
		parsedCapabilities.length > 0 && selectedCapabilities.length === parsedCapabilities.length
	);

	onMount(async () => {
		const storedPrivateKey = await getKey('privateKey');
		if (storedPrivateKey) {
			keypair = {
				publicKey: (await getKey('publicKey')) as CryptoKey,
				privateKey: storedPrivateKey
			};

			// Get the DID key for display
			try {
				const didableKey = await toDidableKey(keypair);
				myDidKey = didableKey.did();
			} catch (error) {
				console.error('Failed to generate DID key:', error);
			}
		} else {
			toast.error('Failed to retrieve keypair from storage');
		}

		ucanToken = (await getToken('rootToken')) || '';

		if (ucanToken && ucanToken !== '') {
			try {
				const decoded = ucans.parse(ucanToken);
				parsedCapabilities = decoded.payload.att || [];
			} catch (error) {
				console.error('Failed to parse UCAN token:', error);
				toast.error('Failed to parse UCAN token');
			}
		}
	});

	function toggleCapability(capability: ucans.Capability) {
		const exists = selectedCapabilities.find(
			(sel) =>
				ucans.ability.isEqual(sel.can, capability.can) &&
				JSON.stringify(sel.with) === JSON.stringify(capability.with)
		);
		if (exists) {
			selectedCapabilities = selectedCapabilities.filter(
				(sel) =>
					!(
						ucans.ability.isEqual(sel.can, capability.can) &&
						JSON.stringify(sel.with) === JSON.stringify(capability.with)
					)
			);
		} else {
			selectedCapabilities = [...selectedCapabilities, capability];
		}
	}

	function toggleAllCapabilities() {
		if (isAllSelected) {
			selectedCapabilities = [];
		} else {
			selectedCapabilities = [...parsedCapabilities];
		}
	}

	function formatCapability(cap: ucans.Capability): string {
		const scheme = typeof cap.with === 'object' && cap.with.scheme ? cap.with.scheme : 'unknown';
		const hierPart =
			typeof cap.with === 'object' && cap.with.hierPart ? cap.with.hierPart : 'unknown';

		let namespace = 'unknown';
		let segments = '[]';

		if (typeof cap.can === 'object') {
			namespace = cap.can.namespace || 'unknown';
			segments = cap.can.segments ? `[${cap.can.segments.join(', ')}]` : '[]';
		} else if (typeof cap.can === 'string') {
			const parts = cap.can.split(':');
			namespace = parts[0] || 'unknown';
			segments = parts[1] ? `[${parts[1]}]` : '[]';
		}

		return `${scheme}:${namespace}@${hierPart}:${segments}`;
	}

	function getCapabilityDetails(cap: ucans.Capability) {
		const ability = cap.can;
		const resource = cap.with;

		let scheme = 'unknown';
		let hierPart = 'unknown';
		let namespace = 'unknown';
		let segments = 'unknown';

		if (typeof resource === 'object') {
			scheme = resource.scheme || 'unknown';
			hierPart = resource.hierPart || 'unknown';
		}

		if (typeof ability === 'object') {
			namespace = ability.namespace || 'unknown';
			segments = ability.segments?.join('.') || 'unknown';
		} else if (typeof ability === 'string') {
			const parts = ability.split(':');
			namespace = parts[0] || 'unknown';
			segments = parts[1] || 'unknown';
		}

		return { scheme, hierPart, namespace, segments };
	}

	function clearForm() {
		recipientPublicKey = '';
		selectedCapabilities = [];
	}

	async function generateDelegation() {
		if (!recipientPublicKey.trim()) {
			toast.error("Please enter the recipient's public key");
			return;
		}

		if (recipientPublicKey === myDidKey) {
			toast.error('Cannot delegate to yourself');
			return;
		}

		if (selectedCapabilities.length === 0) {
			toast.error('Please select at least one capability to delegate');
			return;
		}

		if (!keypair) {
			toast.error('Keypair not available');
			return;
		}

		isGenerating = true;

		try {
			const newUcan = await ucans.build({
				issuer: await toDidableKey(keypair),
				audience: recipientPublicKey,
				lifetimeInSeconds: 60 * 60,
				capabilities: selectedCapabilities,
				proofs: [ucanToken]
			});
			const token = ucans.encode(newUcan);

			generatedDelegation = token;

			clearForm();

			toast.success('Delegation generated successfully');

			await tick();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (error) {
			console.error('Failed to generate delegation:', error);
			toast.error('Failed to generate delegation: ' + (error as Error).message);
		} finally {
			isGenerating = false;
		}
	}

	function copyToClipboard(token: string) {
		navigator.clipboard.writeText(token);
		toast.success('Delegation copied to clipboard');
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-slate-50">Generate Delegation</h1>
		<p class="text-slate-600 dark:text-slate-400 mt-2">
			Create a delegation token to grant specific capabilities to another user.
		</p>
	</div>

	{#if generatedDelegation}
		<Card>
			<CardHeader>
				<CardTitle>Generated Delegation Token</CardTitle>
				<CardDescription>Your generated delegation token. Click to copy the token.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<Textarea
					value={generatedDelegation}
					rows={8}
					readonly
					class="font-mono text-xs resize-none"
				/>
				<Button
					onclick={() => copyToClipboard(generatedDelegation!)}
					variant="outline"
					class="w-full"
				>
					Copy Token
				</Button>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Recipient Details</CardTitle>
			<CardDescription>
				Enter the recipient's public key who will receive the delegation.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-2">
				<Label for="recipient-key">Recipient's Public Key (DID)</Label>
				<Input
					id="recipient-key"
					placeholder="Enter the recipient's DID key"
					bind:value={recipientPublicKey}
					class="font-mono text-sm"
				/>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Available Capabilities</CardTitle>
			<CardDescription>
				Select the capabilities you want to delegate to the recipient.
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if parsedCapabilities.length > 0}
				<div class="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
					<div class="flex items-center space-x-3">
						<Checkbox
							id="select-all"
							checked={isAllSelected}
							onCheckedChange={toggleAllCapabilities}
						/>
						<Label for="select-all" class="text-sm font-medium cursor-pointer">
							{isAllSelected ? 'Deselect All' : 'Select All'}
						</Label>
					</div>
				</div>

				<Accordion type="multiple" class="w-full">
					{#each parsedCapabilities as capability, index (capability.can)}
						{@const details = getCapabilityDetails(capability)}
						<AccordionItem value="capability-{index}">
							<AccordionTrigger class="text-left">
								<div class="flex items-center space-x-3 flex-1">
									<Checkbox
										id="capability-{index}"
										checked={selectedCapabilities.find(
											(sel) =>
												ucans.ability.isEqual(sel.can, capability.can) &&
												JSON.stringify(sel.with) === JSON.stringify(capability.with)
										) !== undefined}
										onCheckedChange={() => toggleCapability(capability)}
										onclick={(e) => e.stopPropagation()}
									/>
									<Label for="capability-{index}" class="text-sm font-medium cursor-pointer">
										{formatCapability(capability)}
									</Label>
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<div class="pl-8 space-y-2">
									<div class="text-xs text-slate-500 dark:text-slate-400">
										<strong>Scheme:</strong>
										{details.scheme}
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										<strong>Hier Part:</strong>
										{details.hierPart}
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										<strong>Namespace:</strong>
										{details.namespace}
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										<strong>Segments:</strong>
										{details.segments}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					{/each}
				</Accordion>

				<div class="mt-4 text-sm text-slate-600 dark:text-slate-400">
					{#if selectedCapabilities.length > 0}
						{#if selectedCapabilities.length === 1}
							{selectedCapabilities.length} capability selected
						{:else}
							{selectedCapabilities.length} capabilities selected
						{/if}
					{:else}
						No capabilities selected
					{/if}
				</div>
			{:else}
				<p class="text-slate-500 dark:text-slate-400 text-sm">
					No capabilities found in the current UCAN token.
				</p>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Generate Delegation</CardTitle>
			<CardDescription>Create the delegation token with the selected capabilities.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Button
				onclick={generateDelegation}
				disabled={isGenerating || !recipientPublicKey.trim() || selectedCapabilities.length === 0}
				class="w-full"
			>
				{isGenerating ? 'Generating...' : 'Generate Delegation'}
			</Button>
			{#if recipientPublicKey.trim() || selectedCapabilities.length > 0}
				<Button onclick={clearForm} variant="outline" class="w-full">Clear Form</Button>
			{/if}
		</CardContent>
	</Card>
</div>
