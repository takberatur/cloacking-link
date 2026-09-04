<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLinkIcon, MousePointerClickIcon, ShieldCheckIcon } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let launching = $state(false);
	let popupBlocked = $state(false);

	let capKey = $derived(`ls:popunder:${data.campaignId}`);
	let returnKey = $derived(`ls:popunder:return:${data.requestId}`);

	function recentDisplays(): number[] {
		try {
			const parsed = JSON.parse(localStorage.getItem(capKey) ?? '[]');
			if (!Array.isArray(parsed)) return [];
			const cutoff = Date.now() - data.plan.frequencyWindowHours * 60 * 60 * 1000;
			return parsed.filter(
				(value): value is number => typeof value === 'number' && value >= cutoff
			);
		} catch {
			return [];
		}
	}

	function recordDisplay() {
		localStorage.setItem(capKey, JSON.stringify([...recentDisplays(), Date.now()]));
	}

	function openBlankWindow(): Window | null {
		const popup = window.open('about:blank', '_blank');
		if (popup) popup.opener = null;
		return popup;
	}

	function delayedNavigate(url: string) {
		window.setTimeout(() => window.location.replace(url), data.plan.delayMs);
	}

	function launch() {
		if (launching) return;
		launching = true;
		popupBlocked = false;

		if (data.plan.behavior === 'same_tab') {
			recordDisplay();
			sessionStorage.setItem(returnKey, 'pending');
			window.location.assign(data.primaryUrl);
			return;
		}

		const popup = openBlankWindow();
		if (!popup) {
			launching = false;
			popupBlocked = true;
			return;
		}

		recordDisplay();
		if (data.plan.behavior === 'background') {
			popup.location.replace(data.primaryUrl);
			delayedNavigate(data.plan.targetUrl);
		} else {
			popup.location.replace(data.plan.targetUrl);
			delayedNavigate(data.primaryUrl);
		}
	}

	onMount(() => {
		const showPendingTarget = () => {
			if (sessionStorage.getItem(returnKey) !== 'pending') return false;
			sessionStorage.removeItem(returnKey);
			window.location.replace(data.plan.targetUrl);
			return true;
		};
		if (showPendingTarget()) return;
		if (recentDisplays().length >= data.plan.frequencyCap) {
			window.location.replace(data.primaryUrl);
			return;
		}
		const onPageShow = () => showPendingTarget();
		window.addEventListener('pageshow', onPageShow);
		return () => window.removeEventListener('pageshow', onPageShow);
	});
</script>

<svelte:head>
	<title>Continue to {data.campaignName}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
	<section class="w-full max-w-md text-center">
		<div class="mx-auto flex size-12 items-center justify-center rounded-md border bg-card">
			<ExternalLinkIcon class="size-5" />
		</div>
		<p class="mt-6 text-sm font-medium text-muted-foreground">{data.campaignName}</p>
		<h1 class="mt-2 text-2xl font-semibold">Your destination is ready</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
			Continue to open the main offer. A secondary page may remain available in another tab.
		</p>

		<button
			type="button"
			class="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
			disabled={launching}
			onclick={launch}
		>
			<MousePointerClickIcon class="size-4" />
			{launching ? 'Opening...' : 'Continue to offer'}
		</button>

		{#if popupBlocked}
			<div class="mt-5 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-left">
				<p class="text-sm font-medium">Your browser blocked the extra tab</p>
				<p class="mt-1 text-xs leading-5 text-muted-foreground">
					Use the links below to open both destinations manually.
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<a
						href={data.primaryUrl}
						class="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
						>Main offer</a
					>
					<a
						href={data.plan.targetUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium"
						>Second target</a
					>
				</div>
			</div>
		{/if}

		<p class="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
			<ShieldCheckIcon class="size-4" /> Requires a confirmed click to respect browser protections
		</p>
	</section>
</main>
