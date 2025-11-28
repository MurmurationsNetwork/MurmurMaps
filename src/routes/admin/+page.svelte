<script lang="ts">
	import { page } from '$app/state';
	import { deleteCluster } from '$lib/api/clusters';
	import { Alert, AlertTitle } from '$lib/components/ui/alert';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { buttonVariants } from '$lib/components/ui/button';
	import { formatDate } from '$lib/utils/date';
	import { CircleAlert } from '@lucide/svelte';
	import type { Page } from '@sveltejs/kit';

	import { toast } from 'svelte-sonner';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	interface CustomPageState extends Page {
		state: {
			message?: string;
		};
	}

	let typedPage = page as unknown as CustomPageState;

	let clusters = $state(data?.clusters ?? []);

	async function handleDeleteCluster(clusterUuid: string) {
		try {
			const { success, error } = await deleteCluster(clusterUuid);

			if (!success) {
				toast.error(error ?? 'Failed to delete cluster');
				return;
			}

			clusters = clusters.filter((cluster) => cluster.clusterUuid !== clusterUuid);
			toast.success('Cluster deleted successfully');
		} catch (error) {
			toast.error(`Failed to delete cluster: ${error}`);
		}
	}
</script>

<div class="container mx-auto p-4">
	{#if typedPage?.state?.message}
		<Alert class="mb-6">
			<CircleAlert class="size-4" />
			<AlertTitle>
				{typedPage.state.message}
			</AlertTitle>
		</Alert>
	{/if}

	<div class="mb-6">
		<Button href="/admin/clusters/create">Create Cluster</Button>
	</div>

	<div class="mb-6 max-w-none text-slate-700 dark:text-slate-300">
		<!-- <p class="mb-2">
		Add a shortcode into a page or post. More information about the parameters for shortcodes can be
		found
		<a
			href="https://murmurations.network"
			class="font-medium text-slate-900 hover:underline dark:text-slate-50">in the docs</a
		>.
	</p> -->
		<p>
			Click the <span class="font-extrabold">Update Nodes</span> button to check for updates to the
			nodes in that map.
			<span class="font-extrabold">Manage Nodes</span> enables you to change the published status of
			nodes without checking for updates.
		</p>
	</div>

	{#if clusters.length === 0}
		<div class="flex h-32 items-center justify-center">
			<div class="text-center">
				<p class="text-lg font-semibold text-slate-700 dark:text-slate-300">
					No Clusters Available
				</p>
				<p class="text-sm text-slate-500 dark:text-slate-400">
					Please create a new cluster to get started.
				</p>
			</div>
		</div>
	{:else}
		{#each clusters as cluster (cluster.clusterUuid)}
			<div
				class="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="mb-4">
					<h2 class="text-xl font-semibold text-slate-900 dark:text-slate-50">
						{cluster.name}
					</h2>

					{#if cluster.description}
						<div class="text-slate-700 dark:text-slate-300">
							{cluster.description}
						</div>
					{/if}
				</div>

				<div class="mb-6 space-y-3">
					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Query URL:</div>
						<div class="break-all text-slate-700 dark:text-slate-300 md:col-span-3">
							<a
								href={`${cluster.indexUrl}${cluster.queryUrl}`}
								class="text-sm text-slate-900 hover:underline dark:text-slate-50"
								>{`${cluster.indexUrl}${cluster.queryUrl}`}</a
							>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Map Center:</div>
						<div class="text-slate-700 dark:text-slate-300 md:col-span-3">
							{cluster.centerLat}, {cluster.centerLon}
						</div>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Map Scale:</div>
						<div class="text-slate-700 dark:text-slate-300 md:col-span-3">{cluster.scale}</div>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Last Update from Index:</div>
						<div class="text-slate-700 dark:text-slate-300 md:col-span-3">
							{formatDate(cluster.lastUpdated)}
						</div>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Cluster Created:</div>
						<div class="text-slate-700 dark:text-slate-300 md:col-span-3">
							{formatDate(cluster.createdAt)}
						</div>
					</div>

					<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<div class="font-medium text-slate-900 dark:text-slate-50">Cluster Edited:</div>
						<div class="text-slate-700 dark:text-slate-300 md:col-span-3">
							{formatDate(cluster.updatedAt)}
						</div>
					</div>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button href={`/admin/clusters/${cluster.clusterUuid}/update`}>Update Nodes</Button>
					<Button href={`/admin/clusters/${cluster.clusterUuid}/select`}>Manage Nodes</Button>
					<Button variant="secondary" href={`/admin/clusters/${cluster.clusterUuid}/edit`}
						>Edit Cluster</Button
					>
					<AlertDialog.Root>
						<AlertDialog.Trigger
							class={buttonVariants({ variant: 'destructive' }) + ' cursor-pointer'}
						>
							Delete Cluster
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Delete Cluster</AlertDialog.Title>
							</AlertDialog.Header>
							<AlertDialog.Description>
								<p>
									Are you sure you want to delete the cluster: {cluster.name}?
								</p>
							</AlertDialog.Description>
							<AlertDialog.Footer>
								<AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
								<AlertDialog.Action
									class="cursor-pointer"
									onclick={() => handleDeleteCluster(cluster.clusterUuid)}
								>
									Continue
								</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</div>
			</div>
		{/each}
	{/if}
</div>
