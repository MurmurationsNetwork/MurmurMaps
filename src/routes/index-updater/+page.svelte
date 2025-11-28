<script lang="ts">
	import { deleteIndex, getIndexStatus, postIndex } from '$lib/api/profiles';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import { CircleAlert, CircleCheck } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let postProfileUrl = $state('');
	let checkProfileUrl = $state('');
	let deleteProfileUrl = $state('');
	let postResponse = $state('');
	let statusResponse = $state('');
	let deleteResponse = $state('');
	let postResponseOk = $state(true);
	let statusResponseOk = $state(true);
	let deleteResponseOk = $state(true);
	let isSubmittingPost = $state(false);
	let isSubmittingCheck = $state(false);
	let isSubmittingDelete = $state(false);
	let sourceIndexUrl = $state('');

	onMount(() => {
		if (!$sourceIndexStore) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}
		loadSourceIndexUrl();
	});

	// When the source index changes, update the URL
	$effect(() => {
		const id = $sourceIndexStore;
		if (!id) return;

		queueMicrotask(() => {
			loadSourceIndexUrl();

			// Clear all page states and responses
			postProfileUrl = '';
			checkProfileUrl = '';
			deleteProfileUrl = '';
			postResponse = '';
			statusResponse = '';
			deleteResponse = '';
			postResponseOk = true;
			statusResponseOk = true;
			deleteResponseOk = true;
			isSubmittingPost = false;
			isSubmittingCheck = false;
			isSubmittingDelete = false;
		});
	});

	function loadSourceIndexUrl() {
		const sourceIndexId = $sourceIndexStore;

		if (!sourceIndexId) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		const src = data.sourceIndexes.find((s) => s.id === sourceIndexId);

		if (!src) {
			toast.error('Invalid Source Index.');
			return;
		}

		sourceIndexUrl = src.url;
	}

	async function postProfile(): Promise<void> {
		if (!sourceIndexUrl) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		isSubmittingPost = true;
		const { data, success, errors, error } = await postIndex(postProfileUrl, sourceIndexUrl);
		if (success) {
			postResponseOk = true;
			postResponse = JSON.stringify(data);
		} else {
			toast.error(error ?? 'Error posting profile');
			postResponse = JSON.stringify(errors);
			postResponseOk = false;
		}
		isSubmittingPost = false;
	}

	async function checkProfileStatus(): Promise<void> {
		if (!sourceIndexUrl) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		isSubmittingCheck = true;
		const nodeId = await getHash(checkProfileUrl);
		const { data, success, errors, error } = await getIndexStatus(nodeId, sourceIndexUrl);
		if (success) {
			statusResponse = JSON.stringify(data);
			statusResponseOk = true;
		} else {
			toast.error(error ?? 'Error checking profile status');
			statusResponse = JSON.stringify(errors);
			statusResponseOk = false;
		}
		isSubmittingCheck = false;
	}

	async function deleteProfile(): Promise<void> {
		if (!sourceIndexUrl) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		isSubmittingDelete = true;
		const nodeId = await getHash(deleteProfileUrl);
		const { data, success, errors, error } = await deleteIndex(nodeId, sourceIndexUrl);
		if (success) {
			deleteResponseOk = true;
			deleteResponse = JSON.stringify(data);
		} else {
			toast.error(error ?? 'Error deleting profile');
			deleteResponse = JSON.stringify(errors);
			deleteResponseOk = false;
		}
		isSubmittingDelete = false;
	}

	async function getHash(profileUrl: string) {
		const data = new TextEncoder().encode(profileUrl);
		const buffer = await crypto.subtle.digest('SHA-256', data);

		return Array.from(new Uint8Array(buffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}
</script>

<div class="container mx-auto p-4">
	<div class="mb-4 sm:flex sm:items-center">
		<div class="text-gray-900 sm:flex-auto dark:text-gray-50">
			<h1 class="text-2xl font-bold mb-2">Index Updater</h1>
			<p>
				Manage your profile in the Murmurations Index. Add, update, check status, or delete your
				profile.
			</p>
		</div>
	</div>

	<div class="space-y-6">
		<!-- Add/Update Profile Section -->
		<div class="card p-4 variant-ghost-primary mb-4 border-2 border-gray-200 rounded-lg">
			<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
				Add/Update Profile in Index
			</h2>
			<p class="text-gray-700 dark:text-gray-300 mb-4">
				Post your profile to your website then add your profile, and always update the Index every
				time you change it to enable data aggregators to learn about your recent changes.
			</p>
			<div class="space-y-4">
				<Input
					type="text"
					placeholder="https://your.site/directory/profile.json"
					bind:value={postProfileUrl}
					class="w-full"
				/>
				<div class="flex justify-center">
					<Button onclick={postProfile} disabled={isSubmittingPost} class="w-full sm:w-auto px-8">
						{isSubmittingPost ? 'Posting...' : 'Post'}
					</Button>
				</div>
			</div>
			{#if postResponse}
				<div class="mt-4">
					<Alert.Root variant={postResponseOk ? 'default' : 'destructive'}>
						{#if postResponseOk}
							<CircleCheck class="h-4 w-4" />
							<Alert.Title>Success</Alert.Title>
						{:else}
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Error</Alert.Title>
						{/if}
						<Alert.Description>
							<pre class="mt-2 overflow-auto text-sm">{JSON.stringify(
									JSON.parse(postResponse),
									null,
									2
								)}</pre>
						</Alert.Description>
					</Alert.Root>
				</div>
			{/if}
		</div>

		<!-- Check Profile Status Section -->
		<div class="card p-4 variant-ghost-primary mb-4 border-2 border-gray-200 rounded-lg">
			<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
				Check Profile Status in Index
			</h2>
			<p class="text-gray-700 dark:text-gray-300 mb-4">
				Get status and other information about your profile from the Index.
			</p>
			<div class="space-y-4">
				<Input
					type="text"
					placeholder="https://your.site/directory/profile.json"
					bind:value={checkProfileUrl}
					class="w-full"
				/>
				<div class="flex justify-center">
					<Button
						onclick={checkProfileStatus}
						disabled={isSubmittingCheck}
						class="w-full sm:w-auto px-8"
					>
						{isSubmittingCheck ? 'Checking...' : 'Check'}
					</Button>
				</div>
			</div>
			{#if statusResponse}
				<div class="mt-4">
					<Alert.Root variant={statusResponseOk ? 'default' : 'destructive'}>
						{#if statusResponseOk}
							<CircleCheck class="h-4 w-4" />
							<Alert.Title>Success</Alert.Title>
						{:else}
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Error</Alert.Title>
						{/if}
						<Alert.Description>
							<pre class="mt-2 overflow-auto text-sm">{JSON.stringify(
									JSON.parse(statusResponse),
									null,
									2
								)}</pre>
						</Alert.Description>
					</Alert.Root>
				</div>
			{/if}
		</div>

		<!-- Delete Profile Section -->
		<div class="card p-4 variant-ghost-primary mb-2 border-2 border-gray-200 rounded-lg">
			<h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
				Delete Profile from Index
			</h2>
			<p class="text-gray-700 dark:text-gray-300 mb-4">
				Remove your profile from your website first (it should return a <code
					class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">404 Not Found</code
				> status code) and then submit it here to delete it from the Index.
			</p>
			<div class="space-y-4">
				<Input
					type="text"
					placeholder="https://your.site/directory/profile.json"
					bind:value={deleteProfileUrl}
					class="w-full"
				/>
				<div class="flex justify-center">
					<Button
						onclick={deleteProfile}
						disabled={isSubmittingDelete}
						variant="destructive"
						class="w-full sm:w-auto px-8"
					>
						{isSubmittingDelete ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
			{#if deleteResponse}
				<div class="mt-4">
					<Alert.Root variant={deleteResponseOk ? 'default' : 'destructive'}>
						{#if deleteResponseOk}
							<CircleCheck class="h-4 w-4" />
							<Alert.Title>Success</Alert.Title>
						{:else}
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Error</Alert.Title>
						{/if}
						<Alert.Description>
							<pre class="mt-2 overflow-auto text-sm">{JSON.stringify(
									JSON.parse(deleteResponse),
									null,
									2
								)}</pre>
						</Alert.Description>
					</Alert.Root>
				</div>
			{/if}
		</div>
	</div>
</div>
