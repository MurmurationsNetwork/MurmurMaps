<script lang="ts">
	import { page } from '$app/state';
	import { getClusters } from '$lib/api/clusters';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import { currentTokenStore } from '$lib/stores/token-store';
	import { userStore } from '$lib/stores/user-store';
	import type { Cluster } from '$lib/types/cluster';
	import { formatDate } from '$lib/utils/date';
	import { CircleAlert } from '@lucide/svelte';
	import type { Page } from '@sveltejs/kit';

	let currentToken: string | null = $state(null);
	let enableSiteHints: boolean = $state(true);
	let clusters: Cluster[] = $state([]);
	let isLoading: boolean = $state(false);

	interface CustomPageState extends Page {
		state: {
			message?: string;
		};
	}

	let typedPage = page as unknown as CustomPageState;

	currentTokenStore.subscribe((value) => {
		currentToken = value;
	});

	userStore.subscribe((value) => {
		enableSiteHints = value?.enableSiteHints ?? true;
	});

	async function loadClusters(sourceIndexId?: number) {
		isLoading = true;
		try {
			const { data: clustersData, success } = await getClusters(sourceIndexId);
			if (success) {
				clusters = clustersData || [];
			} else {
				clusters = [];
			}
		} catch (error) {
			console.error('Failed to load clusters:', error);
			clusters = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const sourceIndexId = $sourceIndexStore;
		if (sourceIndexId) {
			loadClusters(sourceIndexId);
		} else {
			clusters = [];
		}
	});
</script>

{#if typedPage?.state?.message}
	<Alert class="mb-6">
		<CircleAlert class="size-4" />
		<AlertTitle>
			{typedPage.state.message}
		</AlertTitle>
	</Alert>
{/if}

<div class="container mx-auto p-4">
	<div class="mb-6">
		{#if !currentToken}
			<Alert
				class="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 mb-4"
			>
				<AlertTitle
					>You have not registered yet. <a href="/register" class="underline hover:no-underline"
						>Click here to register</a
					>.</AlertTitle
				>
			</Alert>
		{/if}
		{#if enableSiteHints}
			<Alert
				class="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
			>
				<AlertDescription class="mt-4">
					<Accordion.Root type="single">
						<Accordion.Item value="item-1" class="border-none">
							<Accordion.Trigger>What is MurmurMaps?</Accordion.Trigger>
							<Accordion.Content>
								With MurmurMaps you can:
								<ul class="list-disc list-inside">
									<li class="mt-2">
										Create maps and directories by curating clusters of open, decentralized data
										from the Murmurations index
									</li>
									<li>
										Create and manage your own open data sets for inclusion in the Murmurations
										index
									</li>
									<li>Explore the data in the Murmurations index</li>
								</ul>
							</Accordion.Content>
						</Accordion.Item>
						<Accordion.Item value="item-2" class="border-none">
							<Accordion.Trigger>How do I create my own maps and directories?</Accordion.Trigger>
							<Accordion.Content>
								MurmurMaps is open source software. You can find the source code on <a
									href="https://github.com/MurmurationsNetwork/MurmurMaps"
									target="_blank"
									class="text-primary hover:text-primary/80 underline">GitHub</a
								>. Download the code and deploy it to a cloud provider (we use Cloudflare).
							</Accordion.Content>
						</Accordion.Item>
						{#if !currentToken}
							<Accordion.Item value="item-3" class="border-none">
								<Accordion.Trigger>Why should I register?</Accordion.Trigger>
								<Accordion.Content>
									Registering allows you to save your data (a single data item is called a profile)
									to MurmurMaps so it can be indexed in the Murmurations index and made available to
									others to create maps and directories. Go to <b>Tools > Profile Generator</b> to
									create a single profile or <b>Tools > Batch Importer</b> to import multiple profiles
									into MurmurMaps from a CSV file.
								</Accordion.Content>
							</Accordion.Item>
						{/if}
					</Accordion.Root>
				</AlertDescription>
			</Alert>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex h-32 items-center justify-center">
			<div class="text-center">
				<p class="text-lg font-semibold text-slate-700 dark:text-slate-300">Loading clusters...</p>
			</div>
		</div>
	{:else if clusters.length === 0}
		<div class="flex h-32 items-center justify-center">
			<div class="text-center">
				<p class="text-lg font-semibold text-slate-700 dark:text-slate-300">
					No Clusters Available
				</p>
				<p class="text-sm text-slate-500 dark:text-slate-400">No clusters have been created yet.</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each clusters as cluster (cluster.clusterUuid)}
				<div
					class="rounded-lg border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
				>
					<div class="flex h-full flex-col">
						<div class="mb-4 space-y-1">
							<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
								{cluster.name}
							</h2>

							{#if cluster.description}
								<div class="text-slate-700 dark:text-slate-300">
									{cluster.description}
								</div>
							{/if}

							<p class="text-sm text-slate-500 dark:text-slate-400">
								Last updated: {formatDate(cluster.lastUpdated)}
							</p>
						</div>

						<div class="mt-auto flex gap-2">
							<a
								href="/clusters/{cluster.clusterUuid}/list"
								class="flex-1 inline-flex items-center justify-center rounded-md
								 bg-slate-900 text-white px-3 py-2 text-sm font-medium
								 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200
								 transition"
							>
								Directory
							</a>

							<a
								href="/clusters/{cluster.clusterUuid}/map"
								class="flex-1 inline-flex items-center justify-center rounded-md border
								 border-slate-300 bg-white text-slate-700 px-3 py-2 text-sm font-medium
								 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900
								 dark:text-slate-200 dark:hover:bg-slate-800
								 transition"
							>
								Map
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
