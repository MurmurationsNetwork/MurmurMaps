<script lang="ts" module>
	import { checkAdminCapability } from '$lib/utils/ucan-utils';
	import {
		Boxes,
		CircleUserRound,
		DatabaseIcon,
		KeyIcon,
		SearchIcon,
		SettingsIcon,
		ShieldIcon,
		UserPlusIcon,
		UsersIcon,
		WrenchIcon
	} from '@lucide/svelte';

	const data = {
		navMain: [
			{
				title: 'Clusters',
				url: '/',
				icon: Boxes
			},
			{
				title: 'Index Explorer',
				url: '/index-explorer',
				icon: SearchIcon
			},
			{
				title: 'Tools',
				url: '#',
				icon: WrenchIcon,
				items: [
					{
						title: 'Profile Generator',
						url: '/profile-generator'
					},
					{
						title: 'Batch Importer',
						url: '/batch-importer'
					},
					{
						title: 'Index Updater',
						url: '/index-updater'
					}
				]
			},
			{
				title: 'My Account',
				url: '#',
				icon: CircleUserRound,
				requiresToken: true,
				items: [
					{
						title: 'Account Settings',
						url: '/account-settings'
					},
					{
						title: 'Generate Delegation',
						url: '/generate-delegation'
					},
					{
						title: 'Receive Delegation',
						url: '/receive-delegation'
					}
				]
			},
			{
				title: 'Register',
				url: '/register',
				icon: UserPlusIcon,
				hideWhenToken: true
			}
		]
	};

	const adminNav = [
		{
			title: 'Cluster Management',
			url: '/admin',
			icon: DatabaseIcon
		},
		{
			title: 'Source Config',
			url: '/admin/source-indexes',
			icon: SettingsIcon
		},
		{
			title: 'Users',
			url: '/admin/users',
			icon: UsersIcon
		},
		{
			title: 'Roles',
			url: '/admin/roles',
			icon: ShieldIcon
		},
		{
			title: 'Capabilities',
			url: '/admin/capabilities',
			icon: KeyIcon
		}
	];
</script>

<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { userStore } from '$lib/stores/user-store';
	import type { User } from '$lib/types/user';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	import type { ComponentProps } from 'svelte';

	import NavMain from './nav-main.svelte';

	let {
		ref = $bindable(null),
		currentToken = null,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		currentToken?: string | null;
	} = $props();

	let currentUser: User | null = $state(null);

	userStore.subscribe((user) => {
		currentUser = user;
	});

	const filteredNavMain = $derived(
		data.navMain.filter((item) => {
			if (item.requiresToken && !currentToken) return false;
			if (item.hideWhenToken && currentToken) return false;
			return true;
		})
	);

	const showAdmin = $derived(checkAdminCapability(currentToken));
</script>

<Sidebar.Root {...restProps} bind:ref>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props }: { props: Record<string, unknown> })}
						<a href="/" {...props}>
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								<MapPinIcon class="size-4" />
							</div>
							<div class="flex flex-col gap-0.5 leading-none">
								<span class="font-medium">MurmurMaps</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#if currentUser}
			<div class="px-3 py-3 mb-4 bg-sidebar-accent/70 border border-sidebar-border/50">
				<span class="text-base font-semibold text-sidebar-foreground">
					Welcome, {currentUser.name ?? ''}
				</span>
			</div>
		{/if}
		<NavMain items={filteredNavMain} />
		{#if showAdmin}
			<NavMain items={adminNav} groupLabel="Admin Menu" />
		{/if}
	</Sidebar.Content>
	<Sidebar.Rail />
</Sidebar.Root>
