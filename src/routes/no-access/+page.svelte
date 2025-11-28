<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { AlertTriangle, ArrowLeft, Home } from '@lucide/svelte';

	function goHome() {
		goto('/');
	}

	function goBack() {
		if (history.length > 2) {
			history.go(-2);
		} else {
			goto('/');
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
			>
				<AlertTriangle class="h-8 w-8 text-red-600 dark:text-red-400" />
			</div>
			<CardTitle class="text-2xl font-bold text-slate-900 dark:text-slate-50">
				Access Denied
			</CardTitle>
			<CardDescription class="text-slate-600 dark:text-slate-400">
				You don't have permission to access this page
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm text-slate-600 dark:text-slate-400 text-center">
				You may need to log in with an account that has the appropriate permissions, or contact an
				administrator for access.
			</p>
			<div class="flex flex-col sm:flex-row gap-3">
				<Button variant="outline" onclick={goBack} class="flex-1">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Go Back
				</Button>
				<Button onclick={goHome} class="flex-1">
					<Home class="mr-2 h-4 w-4" />
					Home
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
