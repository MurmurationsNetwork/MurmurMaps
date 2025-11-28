<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { refreshRootToken } from '$lib/api/request';
	import { getUser } from '$lib/api/users';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Toaster } from '$lib/components/ui/sonner';
	import { getDelegations, getToken, storeDelegations, storeToken } from '$lib/core';
	import { getOrCreateKeyPair } from '$lib/crypto';
	import { dbStatus } from '$lib/stores/db-status';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import {
		currentTokenStore,
		delegationsStore,
		rootTokenStore,
		selectedDelegationStore
	} from '$lib/stores/token-store';
	import { userStore } from '$lib/stores/user-store';
	import type { CryptoKeyPair } from '$lib/types/crypto';
	import type { Delegation } from '$lib/types/delegation';
	import { checkDbStatus } from '$lib/utils/check-db-status';
	import {
		issueAccessUcan,
		isUcanExpired,
		verifyUcanWithCapabilities
	} from '$lib/utils/ucan-utils';
	import { CircleAlert, Clock, User, WifiOff } from '@lucide/svelte';

	import { onMount } from 'svelte';

	import '../app.css';

	let { children, data } = $props();

	let isDbOnline: boolean = $state(true);
	let isOnline: boolean = $state(true);
	let isReady: boolean = $state(false);

	const siteName = 'MurmurMaps';

	// Source Index Selector
	let selectedSourceIndexId: string = $state('');

	sourceIndexStore.subscribe((v) => (selectedSourceIndexId = v?.toString() ?? ''));

	// Auto-select first source index if none is selected or if selected one is invalid
	$effect(() => {
		if (data.sourceIndexes.length > 0) {
			if (!selectedSourceIndexId) {
				const firstSourceIndex = data.sourceIndexes[0];
				sourceIndexStore.set(firstSourceIndex.id);
			} else {
				const isValidSelection = data.sourceIndexes.some(
					(s) => s.id.toString() === selectedSourceIndexId
				);
				if (!isValidSelection) {
					const firstSourceIndex = data.sourceIndexes[0];
					sourceIndexStore.set(firstSourceIndex.id);
				}
			}
		}
	});

	function handleSourceIndexChange(value: string | null) {
		if (!value) return;
		sourceIndexStore.set(value ? Number(value) : null);
	}

	const sourceIndexTriggerContent = $derived(
		data.sourceIndexes.find((s) => s.id.toString() === selectedSourceIndexId)?.label ??
			'Select a Source Index'
	);

	// Define routes that do not require DB status check
	const routesWithDbCheck = ['/profile-generator', '/batch-importer'];

	// Subscribe to dbStatus only if the route requires it
	if (routesWithDbCheck.includes(page.url.pathname)) {
		dbStatus.subscribe((value) => {
			isDbOnline = value;
		});
	}

	const hiddenRoutes = ['/login', '/register'];
	const showMenubar = $derived(
		!hiddenRoutes.includes(page.url.pathname) && !page.url.pathname.endsWith('/embed')
	);

	// Subscribe to stores
	let rootToken: string | null = $state(null);
	let currentToken: string | null = $state(null);
	let delegations: Delegation[] = $state([]);
	let selectedDelegation: string | null = $state(null);

	rootTokenStore.subscribe((v) => {
		rootToken = v;
	});
	currentTokenStore.subscribe((v) => {
		currentToken = v;
	});
	delegationsStore.subscribe((v) => {
		delegations = v;
	});
	selectedDelegationStore.subscribe((v) => {
		selectedDelegation = v;
	});

	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/profile-generator',
		'/batch-importer',
		'/index-explorer',
		'/index-updater',
		'/no-access',
		'/admin/no-access'
	];

	const hasSourceIndexRoute = [
		'/',
		'/profile-generator',
		'/batch-importer',
		'/index-explorer',
		'/index-updater'
	];

	function isPublicRoute(path: string): boolean {
		if (publicRoutes.includes(path)) return true;

		// Support /clusters/*/map, /clusters/*/list, and /clusters/*/embed
		if (
			path.startsWith('/clusters/') &&
			(path.endsWith('/map') || path.endsWith('/list') || path.endsWith('/embed'))
		) {
			return true;
		}

		// Support /clusters/*/nodes/*
		if (/^\/clusters\/[^/]+\/nodes\/[^/]+/.test(path)) {
			return true;
		}

		// Support /profiles/*
		if (path.startsWith('/profiles/')) {
			return true;
		}

		return false;
	}

	async function updateCurrentToken(
		keypair: CryptoKeyPair,
		rootToken: string | null,
		delegation: Delegation | null
	) {
		let newToken: string | null = null;

		if (delegation) {
			newToken = await issueAccessUcan(delegation.token, keypair, 60 * 60);
		} else if (rootToken) {
			newToken = await issueAccessUcan(rootToken, keypair, 60 * 60);
		}

		if (newToken) {
			currentTokenStore.set(newToken);
			await storeToken('currentToken', newToken);
		} else {
			currentTokenStore.set(null);
			await storeToken('currentToken', null);
		}
	}

	function isDelegationExpired(delegation: Delegation): boolean {
		return Date.now() > delegation.expiresAt * 1000;
	}

	function formatExpirationDate(expiresAt: number): string {
		return new Date(expiresAt * 1000).toLocaleString();
	}

	async function removeDelegation(delegationFrom: string) {
		const updatedDelegations = delegations.filter((d) => d.from !== delegationFrom);
		await storeDelegations(updatedDelegations);
		delegationsStore.set(updatedDelegations);
	}

	async function switchUser(delegationFrom: string | null) {
		const keypair = await getOrCreateKeyPair();

		if (delegationFrom === null) {
			selectedDelegationStore.set(null);
			await storeToken('selectedDelegation', null);
			await updateCurrentToken(keypair, rootToken, null);
		} else {
			const delegation = delegations.find((d) => d.from === delegationFrom);
			if (delegation) {
				if (isDelegationExpired(delegation)) {
					await removeDelegation(delegation.from);
					return;
				}
				selectedDelegationStore.set(delegationFrom);
				await storeToken('selectedDelegation', delegationFrom);
				await updateCurrentToken(keypair, rootToken, delegation);
			}
		}
	}

	const delegationOptions = $derived(() => {
		const options = [{ value: 'original', label: 'Original Account' }];

		delegations.forEach((delegation) => {
			options.push({
				value: delegation.from,
				label: delegation.from
			});
		});

		return options;
	});

	let selectValue = $derived(selectedDelegation || 'original');

	function handleSelectChange(value: string | undefined) {
		if (value === 'original') {
			switchUser(null);
		} else if (value) {
			switchUser(value);
		}
	}

	const triggerContent = $derived(
		delegationOptions().find((opt) => opt.value === selectValue)?.label ?? 'Original Account'
	);

	onMount(() => {
		// Check system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.classList.toggle('dark', prefersDark);

		// Listen for system preference changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			document.documentElement.classList.toggle('dark', e.matches);
		});

		// Check online status
		isOnline = navigator.onLine;

		// Add event listeners for online/offline events
		const updateOnlineStatus = () => (isOnline = navigator.onLine);
		window.addEventListener('online', updateOnlineStatus);
		window.addEventListener('offline', updateOnlineStatus);

		// Check database status if route requires it
		if (routesWithDbCheck.includes(page.url.pathname)) {
			checkDbStatus();
		}

		// Cleanup event listeners on component unmount
		return () => {
			window.removeEventListener('online', updateOnlineStatus);
			window.removeEventListener('offline', updateOnlineStatus);
		};
	});

	onMount(() => {
		const init = async () => {
			let keypair = await getOrCreateKeyPair();

			const [root, current, delegations, selectedDelegation] = await Promise.all([
				getToken('rootToken'),
				getToken('currentToken'),
				getDelegations(),
				getToken('selectedDelegation')
			]);

			rootTokenStore.set(root);
			currentTokenStore.set(current);
			delegationsStore.set(delegations);
			selectedDelegationStore.set(selectedDelegation);

			await refreshTokenIfNeeded(keypair);
			await verifyAccessIfNeeded(keypair, page.url.pathname);

			isReady = true;
		};

		init();
	});

	beforeNavigate(async (nav) => {
		if (!nav.to) return;
		if (nav.to.url.pathname === page.url.pathname) return;

		isReady = false;
		const keypair = await getOrCreateKeyPair();
		await verifyAccessIfNeeded(keypair, nav.to?.url.pathname ?? '');
		isReady = true;
	});

	async function refreshTokenIfNeeded(keypair: CryptoKeyPair) {
		let isExpired = false;
		if (rootToken) isExpired = isUcanExpired(rootToken);
		if (!rootToken || isExpired) await refreshRootToken(keypair);
	}

	async function verifyAccessIfNeeded(keypair: CryptoKeyPair, currentPath: string) {
		if (rootToken && (currentPath === '/register' || currentPath === '/login')) {
			goto('/');
			return;
		}

		// Check if the current token is expired and refresh it if needed
		if (rootToken) {
			let isExpired = false;
			if (currentToken) {
				isExpired = isUcanExpired(currentToken);
			}

			if (!currentToken || isExpired) {
				const accessUcan = await issueAccessUcan(rootToken, keypair, 60 * 60);
				currentTokenStore.set(accessUcan);
				await storeToken('currentToken', accessUcan);
			}
		}

		// Public routes don't need to be verified
		if (isPublicRoute(currentPath)) {
			return;
		}

		if (!rootToken || !currentToken) {
			goto('/register');
			return;
		}

		const scheme = 'page';
		let hierPart = currentPath;
		let namespace = 'client';

		let pathToCheck = currentPath;
		if (currentPath.includes('/admin')) {
			namespace = 'admin';
			hierPart = currentPath.replace('/admin', '') || '/';
			pathToCheck = currentPath.replace(/^\/admin/, '') || '/';
		}

		// Only check the first segment of the path. As long as the user has permission for the first segment, they should be able to access the rest of the path
		const segments = pathToCheck.split('/').filter(Boolean);
		hierPart = '/' + (segments[0] ?? '');

		let isVerified = await verifyUcanWithCapabilities(currentToken, scheme, hierPart, namespace, [
			'GET'
		]);

		if (!isVerified) {
			await refreshRootToken(keypair);
			const accessUcan = await issueAccessUcan(rootToken, keypair, 60 * 60);
			currentTokenStore.set(accessUcan);
			await storeToken('currentToken', accessUcan);

			// Verify the new token
			isVerified = await verifyUcanWithCapabilities(currentToken, scheme, hierPart, namespace, [
				'GET'
			]);
		}

		if (!isVerified) {
			goto('/no-access');
			return;
		}
	}

	onMount(() => {
		const unsubscribe = currentTokenStore.subscribe(async (token) => {
			currentToken = token;

			if (currentToken) {
				try {
					const { data: userData, success } = await getUser();
					if (success && userData) {
						userStore.set(userData);
					} else {
						userStore.set(null);
					}
				} catch (err) {
					console.error('Failed to fetch user:', err);
					userStore.set(null);
				}
			} else {
				userStore.set(null);
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>{page.data.title ? `${page.data.title} | ${siteName}` : siteName}</title>
	<script lang="ts">
		// Prevent flash of wrong theme
		(() => {
			if (typeof window !== 'undefined') {
				const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				document.documentElement.classList.toggle('dark', isDark);
			}
		})();
	</script>
	<script
		data-goatcounter={import.meta.env.PROD
			? 'https://stats-tools.murmurations.network/count'
			: 'https://test-stats-tools.murmurations.network/count'}
		async
		src="//stats.murmurations.network/count.js"
	></script>
</svelte:head>

<Toaster position="top-center" richColors={true} />

{#if !isReady}
	<div class="flex min-h-screen">
		<div class="w-64 border-r border-slate-200 dark:border-slate-800 p-4 space-y-3">
			<Skeleton class="h-8 w-40" />
			<Skeleton class="h-6 w-32" />
			<Skeleton class="h-6 w-28" />
			<Skeleton class="h-6 w-36" />
			<Skeleton class="h-6 w-24" />
		</div>

		<div class="flex-1 p-8 space-y-6">
			<Skeleton class="h-10 w-64" />

			<div class="flex space-x-3">
				<Skeleton class="h-10 w-32 rounded-md" />
				<Skeleton class="h-10 w-32 rounded-md" />
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-5/6" />
					<Skeleton class="h-4 w-2/3" />
					<div class="flex space-x-3 pt-4">
						<Skeleton class="h-8 w-24 rounded-md" />
						<Skeleton class="h-8 w-24 rounded-md" />
					</div>
				</div>
				<div class="p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-5/6" />
					<Skeleton class="h-4 w-2/3" />
					<div class="flex space-x-3 pt-4">
						<Skeleton class="h-8 w-24 rounded-md" />
						<Skeleton class="h-8 w-24 rounded-md" />
					</div>
				</div>
				<div class="p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-5/6" />
					<Skeleton class="h-4 w-2/3" />
					<div class="flex space-x-3 pt-4">
						<Skeleton class="h-8 w-24 rounded-md" />
						<Skeleton class="h-8 w-24 rounded-md" />
					</div>
				</div>
				<div class="p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-5/6" />
					<Skeleton class="h-4 w-2/3" />
					<div class="flex space-x-3 pt-4">
						<Skeleton class="h-8 w-24 rounded-md" />
						<Skeleton class="h-8 w-24 rounded-md" />
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
		{#if delegations.length > 0 && rootToken}
			<div
				class="bg-blue-50 border-b border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100"
			>
				<div class="container mx-auto px-4 py-3">
					<div class="flex items-center justify-center space-x-4">
						<User class="w-4 h-4 text-blue-600 dark:text-blue-400" />
						<span class="text-sm font-medium">Acting as:</span>

						<Select.Root type="single" bind:value={selectValue} onValueChange={handleSelectChange}>
							<Select.Trigger
								class="w-[240px] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-300 focus:ring-offset-2 rounded-md px-3 py-2 text-sm"
							>
								<span class="truncate">{triggerContent}</span>
							</Select.Trigger>
							<Select.Content class="min-w-[240px] max-w-[400px]">
								<Select.Group>
									<Select.Label
										class="px-2 py-1.5 text-sm font-semibold text-slate-900 dark:text-slate-50"
										>Available Accounts</Select.Label
									>
									{#each delegationOptions() as option (option.value)}
										<Select.Item
											value={option.value}
											label={option.label}
											class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-slate-100 dark:focus:bg-slate-800 data-disabled:pointer-events-none data-disabled:opacity-50"
										>
											<div class="flex items-center justify-between w-full min-w-0 overflow-hidden">
												<span class="truncate flex-1 mr-2">{option.label}</span>
												{#if option.value !== 'original'}
													{@const delegation = delegations.find((d) => d.from === option.value)}
													{#if delegation}
														<div class="flex items-center space-x-1 text-xs shrink-0">
															<Clock class="w-3 h-3" />
															<span
																class={isDelegationExpired(delegation)
																	? 'text-red-500 dark:text-red-400'
																	: 'text-slate-500 dark:text-slate-400'}
															>
																{isDelegationExpired(delegation)
																	? 'Expired'
																	: formatExpirationDate(delegation.expiresAt)}
															</span>
														</div>
													{/if}
												{/if}
											</div>
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>
		{/if}

		{#if showMenubar}
			<!-- Status Alerts - Position below delegation bar -->
			{#if !isOnline}
				<div class="bg-red-500 border-b border-red-600 text-white shadow-lg">
					<div class="container mx-auto px-4 py-3">
						<div class="flex items-center justify-center space-x-2">
							<WifiOff class="w-5 h-5 text-white" />
							<span class="font-semibold">OFFLINE</span>
							<span class="text-red-100">Check your network connection</span>
						</div>
					</div>
				</div>
			{/if}

			{#if routesWithDbCheck.includes(page.url.pathname) && !isDbOnline}
				<div
					class="bg-amber-100 border-b border-amber-200 text-amber-800 dark:bg-amber-900 dark:border-amber-800 dark:text-amber-200"
				>
					<div class="container mx-auto px-4 py-3">
						<div class="flex items-center justify-center space-x-2">
							<CircleAlert class="w-5 h-5 text-amber-600 dark:text-amber-400" />
							<span class="font-medium">Database Connection Issue</span>
							<span class="text-amber-700 dark:text-amber-300"
								>Unable to connect to the database, please try again in a few minutes</span
							>
						</div>
					</div>
				</div>
			{/if}

			<Sidebar.Provider>
				<AppSidebar {currentToken} />
				<Sidebar.Inset>
					<header
						class="flex flex-col md:flex-row h-auto md:h-16 shrink-0 items-start md:items-center justify-between border-b px-3 py-2 gap-2"
					>
						<div class="flex items-center gap-2 px-3">
							<Sidebar.Trigger />
							<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
							<Breadcrumb.Root>
								<Breadcrumb.List>
									<Breadcrumb.Item>
										<Breadcrumb.Link href="/">{siteName}</Breadcrumb.Link>
									</Breadcrumb.Item>
									{#if page.data.title}
										<Breadcrumb.Separator />
										<Breadcrumb.Item>
											<Breadcrumb.Page>{page.data.title}</Breadcrumb.Page>
										</Breadcrumb.Item>
									{/if}
								</Breadcrumb.List>
							</Breadcrumb.Root>
						</div>

						<!-- Source Index Selector -->
						{#if hasSourceIndexRoute.includes(page.url.pathname)}
							<div class="flex items-center gap-2 self-end md:self-auto">
								<Select.Root
									type="single"
									bind:value={selectedSourceIndexId}
									onValueChange={handleSourceIndexChange}
								>
									<Select.Trigger class="w-[200px] md:w-[220px]">
										{sourceIndexTriggerContent}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.Label class="px-2 py-1 text-sm font-medium">Data Sources</Select.Label
											>
											{#each data.sourceIndexes as src (src.id)}
												<Select.Item value={String(src.id)} label={src.label}>
													{src.label}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
					</header>
					<div class="flex flex-1 flex-col gap-4">
						{@render children()}
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		{:else}
			{@render children()}
		{/if}
	</div>
{/if}
