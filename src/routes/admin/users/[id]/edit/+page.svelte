<script lang="ts">
	import { goto } from '$app/navigation';
	import { updateUserRoles } from '$lib/api/users';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const userId = data.userId ?? 0;
	const allRoles = data.allRoles ?? [];

	let selectedRoleIds = $state(new Set(data.userRoles));
	let isLoading = $state(false);

	function toggleRole(roleId: number) {
		if (selectedRoleIds.has(roleId)) {
			selectedRoleIds.delete(roleId);
		} else {
			selectedRoleIds.add(roleId);
		}
		selectedRoleIds = new SvelteSet(selectedRoleIds);
	}

	async function handleSave() {
		isLoading = true;
		try {
			const result = await updateUserRoles(userId, Array.from(selectedRoleIds));

			if (result.success) {
				toast.success('User roles updated successfully');
				goto('/admin/users');
			} else {
				toast.error(result.error || 'Failed to update user roles');
			}
		} catch (error) {
			console.error('Error updating user roles:', error);
			toast.error('An error occurred while updating user roles');
		} finally {
			isLoading = false;
		}
	}

	function handleCancel() {
		goto('/admin/users');
	}
</script>

<div class="container mx-auto p-4">
	<Card>
		<CardHeader>
			<CardTitle>Edit User Roles - User ID: {data.userId}</CardTitle>
		</CardHeader>
		<CardContent class="space-y-6">
			<div class="space-y-4">
				<h3 class="text-lg font-medium">Available Roles</h3>
				<div class="grid gap-4">
					{#each allRoles as role (role.id)}
						<div class="flex items-center space-x-2">
							<Checkbox
								id="role-{role.id}"
								checked={selectedRoleIds.has(role.id)}
								onCheckedChange={() => toggleRole(role.id)}
								disabled={isLoading}
							/>
							<Label
								for="role-{role.id}"
								class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{role.name}
							</Label>
						</div>
					{/each}
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
