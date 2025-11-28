<script lang="ts">
	import { deleteSourceIndex } from '$lib/api/source-indexes';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import type { SourceIndex } from '$lib/types/source-index';
	import { Database, Plus, SquarePen, Trash2 } from '@lucide/svelte';

	import { toast } from 'svelte-sonner';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let sourceIndexes = $state<SourceIndex[]>(data?.sourceIndexes ?? []);

	async function handleDelete(id: number) {
		try {
			const response = await deleteSourceIndex(id);
			if (response.success) {
				toast.success('Source index deleted successfully');
				sourceIndexes = sourceIndexes.filter((sourceIndex) => sourceIndex.id !== id);
			} else {
				const errorMessage = response.error ?? '';
				toast.error(`Failed to delete source index: ${errorMessage}`);
			}
		} catch (err) {
			console.error(err);
			toast.error('Failed to delete source index');
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Source Index Configuration</h1>
			<p class="text-muted-foreground mt-2">
				Manage the source indexes used to discover and cluster nodes from the Murmurations network.
			</p>
		</div>
		<Button href="/admin/source-indexes/create">
			<Plus class="size-4" />
			Add Source Index
		</Button>
	</div>

	{#if sourceIndexes.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<div class="text-muted-foreground mb-4">
					<Database class="w-16 h-16 mx-auto" />
				</div>
				<h3 class="text-lg font-semibold mb-2">No Source Indexes</h3>
				<p class="text-muted-foreground text-center">
					You haven't configured any source indexes yet. Add your first source index to start
					discovering nodes.
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="border rounded-lg">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Label</TableHead>
						<TableHead>URL</TableHead>
						<TableHead>Library URL</TableHead>
						<TableHead>Data Proxy URL</TableHead>
						<TableHead class="text-center">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each sourceIndexes as sourceIndex (sourceIndex.id)}
						<TableRow>
							<TableCell class="font-medium">
								{sourceIndex.label || '-'}
							</TableCell>
							<TableCell>
								{sourceIndex.url}
							</TableCell>
							<TableCell>
								{sourceIndex.libraryUrl || '-'}
							</TableCell>
							<TableCell>
								{sourceIndex.dataProxyUrl || '-'}
							</TableCell>
							<TableCell class="text-center">
								<div class="flex justify-center gap-2">
									<Button
										variant="outline"
										size="sm"
										href={`/admin/source-indexes/${sourceIndex.id}/edit`}
									>
										<SquarePen class="size-4" />
										Edit
									</Button>
									<AlertDialog.Root>
										<AlertDialog.Trigger
											class={buttonVariants({ variant: 'destructive', size: 'sm' })}
										>
											<Trash2 class="size-4" />
											Delete
										</AlertDialog.Trigger>
										<AlertDialog.Content>
											<AlertDialog.Header>
												<AlertDialog.Title>Delete Source Index</AlertDialog.Title>
											</AlertDialog.Header>
											<AlertDialog.Description>
												<p>
													Are you sure you want to delete "{sourceIndex.label || sourceIndex.url}"?
													This action cannot be undone.
												</p>
											</AlertDialog.Description>
											<AlertDialog.Footer>
												<AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
												<AlertDialog.Action
													class="cursor-pointer"
													onclick={() => handleDelete(sourceIndex.id)}
												>
													Continue
												</AlertDialog.Action>
											</AlertDialog.Footer>
										</AlertDialog.Content>
									</AlertDialog.Root>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>
