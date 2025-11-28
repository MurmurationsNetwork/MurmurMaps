<script lang="ts">
	import { goto } from '$app/navigation';
	import { updateRoleCapabilities } from '$lib/api/role';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const roleId = data.roleId ?? 0;
	const allCapabilities = data.allCapabilities ?? [];

	let selectedCapabilityIds = $state(new Set(data.roleCapabilities));
	let isLoading = $state(false);

	let isAllSelected = $derived(
		allCapabilities.length > 0 && selectedCapabilityIds.size === allCapabilities.length
	);

	function toggleCapability(capabilityId: number) {
		if (selectedCapabilityIds.has(capabilityId)) {
			selectedCapabilityIds.delete(capabilityId);
		} else {
			selectedCapabilityIds.add(capabilityId);
		}
		selectedCapabilityIds = new SvelteSet(selectedCapabilityIds);
	}

	function toggleAllCapabilities() {
		if (isAllSelected) {
			selectedCapabilityIds = new SvelteSet();
		} else {
			selectedCapabilityIds = new SvelteSet(allCapabilities.map((cap) => cap.id));
		}
	}

	async function handleSave() {
		isLoading = true;
		try {
			const result = await updateRoleCapabilities(roleId, Array.from(selectedCapabilityIds));

			if (result.success) {
				toast.success('Role capabilities updated successfully');
				goto('/admin/roles');
			} else {
				toast.error(result.error || 'Failed to update role capabilities');
			}
		} catch (error) {
			console.error('Error updating role capabilities:', error);
			toast.error('An error occurred while updating role capabilities');
		} finally {
			isLoading = false;
		}
	}

	function handleCancel() {
		goto('/admin/roles');
	}

	onMount(() => {
		if (data.error) {
			toast.error(data.error);
		}
	});
</script>

<div class="container mx-auto p-4">
	<Card>
		<CardHeader>
			<CardTitle>Edit Role Capabilities - Role ID: {data.roleId}</CardTitle>
		</CardHeader>
		<CardContent class="space-y-6">
			<div class="space-y-4">
				<h3 class="text-lg font-medium">Available Capabilities</h3>

				{#if allCapabilities.length > 0}
					<div class="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
						<div class="flex items-center space-x-3">
							<Checkbox
								id="select-all"
								checked={isAllSelected}
								onCheckedChange={toggleAllCapabilities}
								disabled={isLoading}
							/>
							<Label for="select-all" class="text-sm font-medium cursor-pointer">
								{isAllSelected ? 'Deselect All' : 'Select All'}
							</Label>
						</div>
					</div>
				{/if}

				<div class="grid gap-4">
					{#each allCapabilities as capability (capability.id)}
						<div class="flex items-center space-x-2">
							<Checkbox
								id="capability-{capability.id}"
								checked={selectedCapabilityIds.has(capability.id)}
								onCheckedChange={() => toggleCapability(capability.id)}
								disabled={isLoading}
							/>
							<Label
								for="capability-{capability.id}"
								class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{capability.scheme}:{capability.hierPart} - {capability.namespace} ({capability.segments})
							</Label>
						</div>
					{/each}
				</div>

				<div class="mt-4 text-sm text-slate-600 dark:text-slate-400">
					{#if selectedCapabilityIds.size > 0}
						{#if selectedCapabilityIds.size === 1}
							{selectedCapabilityIds.size} capability selected
						{:else}
							{selectedCapabilityIds.size} capabilities selected
						{/if}
					{:else}
						No capabilities selected
					{/if}
				</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={handleSave} disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save Changes'}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={isLoading}>Cancel</Button>
			</div>
		</CardContent>
	</Card>
</div>
