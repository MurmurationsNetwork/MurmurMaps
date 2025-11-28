<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils/date';
	import { SquarePen } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let users = $state(data?.users);

	onMount(() => {
		if (data?.error) {
			toast.error(data.error);
		}
	});
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Users Management</h1>
	</div>

	<Card>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Roles</TableHead>
						<TableHead>Email Reset</TableHead>
						<TableHead>Created At</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each users as user (user.id)}
						<TableRow>
							<TableCell>{user.id}</TableCell>
							<TableCell class="font-medium">{user.name}</TableCell>
							<TableCell>
								{#if user.roles && user.roles.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each user.roles as role (role)}
											<Badge variant="default">{role}</Badge>
										{/each}
									</div>
								{:else}
									<Badge variant="outline">No roles</Badge>
								{/if}
							</TableCell>
							<TableCell>
								{#if user.emailReset}
									<Badge variant="destructive">True</Badge>
								{:else}
									<Badge variant="secondary">False</Badge>
								{/if}
							</TableCell>
							<TableCell>{formatDate(user.createdAt)}</TableCell>
							<TableCell>
								<Button variant="outline" size="sm" href={`/admin/users/${user.id}/edit`}>
									<SquarePen class="mr-2 h-4 w-4" />
									Edit Role
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
