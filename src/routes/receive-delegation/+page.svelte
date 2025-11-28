<script lang="ts">
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
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getDelegations, storeDelegations } from '$lib/core';
	import { getKey } from '$lib/crypto';
	import { delegationsStore } from '$lib/stores/token-store';
	import type { Delegation } from '$lib/types/delegation';
	import { decodeUcanToDelegation } from '$lib/utils/ucan-utils';
	import { toDidableKey } from '$lib/utils/ucan-utils';
	import { Trash2 } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let delegationToken = $state('');
	let isProcessing = $state(false);
	let delegations: Delegation[] = $state([]);
	let myDidKey = $state('');

	onMount(async () => {
		delegations = await getDelegations();

		const storedPrivateKey = await getKey('privateKey');
		if (storedPrivateKey) {
			let keypair = {
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
	});

	async function processDelegation() {
		if (!delegationToken.trim()) {
			toast.error('Please enter a delegation token');
			return;
		}

		isProcessing = true;

		try {
			const delegation = await decodeUcanToDelegation(delegationToken.trim());

			const currentDelegations = await getDelegations();

			const exists = currentDelegations.some((d) => d.token === delegation.token);
			if (exists) {
				toast.error('This delegation has already been received');
				return;
			}

			const updatedDelegations = [...currentDelegations, delegation];

			await storeDelegations(updatedDelegations);

			delegationsStore.set(updatedDelegations);
			delegations = updatedDelegations;

			toast.success('Delegation received successfully');
			delegationToken = '';
		} catch (error) {
			console.error('Failed to parse delegation token:', error);
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Invalid delegation token format');
			}
		} finally {
			isProcessing = false;
		}
	}

	async function deleteDelegation(delegationToDelete: Delegation) {
		try {
			const updatedDelegations = delegations.filter((d) => d.token !== delegationToDelete.token);

			await storeDelegations(updatedDelegations);
			delegationsStore.set(updatedDelegations);
			delegations = updatedDelegations;

			toast.success('Delegation deleted successfully');
		} catch (error) {
			console.error('Failed to delete delegation:', error);
			toast.error('Failed to delete delegation');
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString();
	}

	function copyDidKey() {
		if (myDidKey) {
			navigator.clipboard.writeText(myDidKey);
			toast.success('DID key copied to clipboard');
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-slate-50">Receive Delegation</h1>
		<p class="text-slate-600 dark:text-slate-400 mt-2">
			Paste a delegation token below to receive delegated capabilities from another user.
		</p>
	</div>

	{#if myDidKey}
		<Card>
			<CardHeader>
				<CardTitle>Your DID Key</CardTitle>
				<CardDescription>
					This is your DID key that identifies you as the issuer of the delegation.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<Input value={myDidKey} readonly class="font-mono text-sm" />
				<Button onclick={copyDidKey} variant="outline" class="w-full">Copy My DID Key</Button>
			</CardContent>
		</Card>
	{/if}

	{#if delegations.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Received Delegations</CardTitle>
				<CardDescription>
					Manage your received delegations. You can delete delegations you no longer need.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>From</TableHead>
							<TableHead>Expire</TableHead>
							<TableHead class="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each delegations as delegation (delegation.token)}
							<TableRow>
								<TableCell class="font-medium">
									{delegation.from}
								</TableCell>
								<TableCell>
									{delegation.expiresAt ? formatDate(delegation.expiresAt) : 'No expiration'}
								</TableCell>
								<TableCell>
									<Button
										variant="destructive"
										size="sm"
										onclick={() => deleteDelegation(delegation)}
									>
										<Trash2 class="w-4 h-4" />
									</Button>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Delegation Token</CardTitle>
			<CardDescription>Enter the delegation token that was shared with you.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="delegation-token">Delegation Token</Label>
				<Textarea
					id="delegation-token"
					placeholder="Paste your delegation token here..."
					bind:value={delegationToken}
					rows={8}
					class="font-mono text-sm"
				/>
			</div>

			<Button
				onclick={processDelegation}
				disabled={isProcessing || !delegationToken.trim()}
				class="w-full"
			>
				{isProcessing ? 'Processing...' : 'Receive Delegation'}
			</Button>
		</CardContent>
	</Card>
</div>
