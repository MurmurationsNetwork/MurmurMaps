<script lang="ts">
	import { getClusters } from '$lib/api/clusters';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import { currentTokenStore } from '$lib/stores/token-store';
	import { userStore } from '$lib/stores/user-store';
	import type { Cluster } from '$lib/types/cluster';
	import { formatDate } from '$lib/utils/date';

	let currentToken: string | null = $state(null);
	let enableSiteHints: boolean = $state(true);
	let clusters: Cluster[] = $state([]);
	let isLoading: boolean = $state(false);

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
								<p>MurmurMaps provides a range of collaborative mapping tools.</p>
								<p>
									Based on the Murmurations protocol, the MurmurMaps tools provide a way to create,
									import and register ‘profiles’ and to create multiple maps and directories from
									the same shared, distributed, open source data set.
								</p>
								<p>
									Murmurations solves the problems that plague most maps, which are created from a
									centralised database and managed by a single organisation or person, by:
								</p>
								<ul class="list-disc list-inside">
									<li class="mt-2">Distributing the effort of data collection</li>
									<li>Making data interoperable so it can power multiple maps and directories</li>
									<li>Providing a ‘last updated’ timestamp to show the age of every profile</li>
									<li>Distributing the effort of keeping data up to date</li>
									<li>Enabling Profile changes to be reflected on multiple maps and directories</li>
									<li>Improving data quality, reliability and usability</li>
								</ul>
								<p>
									Find out more on <a
										href="https://murmurations.network"
										target="_blank"
										class="text-primary hover:text-primary/80 underline">our website</a
									>
									and in the
									<a
										href="https://docs.murmurations.network"
										target="_blank"
										class="text-primary hover:text-primary/80 underline">Docs</a
									>.
								</p>
								<p>
									This app, and the entire Murmurations protocol, is open source. You can find the
									source code for this app on <a
										href="https://github.com/MurmurationsNetwork/MurmurMaps"
										target="_blank"
										class="text-primary hover:text-primary/80 underline">GitHub</a
									>. Download the code and deploy it to a cloud provider (we use Cloudflare).
								</p>
							</Accordion.Content>
						</Accordion.Item>
						<Accordion.Item value="item-2" class="border-none">
							<Accordion.Trigger>What can you do with MurmurMaps?</Accordion.Trigger>
							<Accordion.Content class="mm-list">
								<ul>
									<li>
										Explore the data registered with the Murmurations index
										<ul>
											<li>
												The Murmurations index keeps a record of where all the data profiles are
												stored. Use the Index Explorer to search for pre-existing data to avoid
												having to start a map from scratch.
											</li>
										</ul>
									</li>
									<li>
										Curate clusters of data from the Murmurations index
										<ul>
											<li>
												We use the term ‘clusters’ to refer to the maps and directories which are
												created from multiple profiles that are registered with the index. Explore
												some of the demonstration clusters below. If you would like to create and
												curate clusters using this instance of MurmurMaps please <a
													href="https://murmurations.network/contact"
													target="_blank"
													class="text-primary hover:text-primary/80 underline">contact us</a
												> for additional permissions.
											</li>
										</ul>
									</li>
									<li>
										Create maps to display on other websites
										<ul>
											<li>
												Every cluster has an embed link at the top right of the page which you can
												use to embed maps that are created with MurmurMaps on any other website.
											</li>
										</ul>
									</li>
									<li>
										Create profiles to include on your maps or directories
										<ul>
											<li>
												Use the Profile Generator to add new data to the Murmurations index to
												display on your maps. Use descriptive tags when creating profiles to help
												other people find the data so it will be automatically added next time you
												update the nodes in your cluster. You can use the Profile Generator to
												create new profiles and host them yourself at your own domain, or log in to
												host them with MurmurMaps.
											</li>
										</ul>
									</li>
									<li>
										Update and remove nodes from the Murmurations Index
										<ul>
											<li>
												You can host Murmurations profiles anywhere on the web - all they need is an
												accessible URL. If you’re hosting your own profiles you can use the Index
												Updater to add, remove or update a node in the index.
											</li>
										</ul>
									</li>
									<li>
										Import large datasets to use on your maps or directories
										<ul>
											<li>
												Imagine if everyone with a spreadsheet, or database shared their public data
												with the commons - mapping would be so much easier! The batch importer makes
												it easy to upload large data sets and register them with the index, so you
												can use the data on your maps and others can benefit from it too.
											</li>
										</ul>
									</li>
								</ul>
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
