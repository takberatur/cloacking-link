<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLinkIcon, SmartphoneIcon, StoreIcon } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let launching = $state(false);
	let fallbackTimer: number | undefined;

	function openApp() {
		if (launching) return;
		launching = true;
		if (data.plan.shouldFallback) {
			fallbackTimer = window.setTimeout(() => {
				if (document.visibilityState === 'visible') window.location.replace(data.plan.fallbackUrl);
			}, data.plan.fallbackDelayMs);
		}
		window.location.href = data.plan.launchUrl;
	}

	onMount(() => {
		const key = `deeplink-attempt:${data.requestId}`;
		let autoTimer: number | undefined;
		if (!sessionStorage.getItem(key)) {
			sessionStorage.setItem(key, '1');
			autoTimer = window.setTimeout(openApp, 350);
		}
		return () => {
			if (autoTimer) window.clearTimeout(autoTimer);
			if (fallbackTimer) window.clearTimeout(fallbackTimer);
		};
	});
</script>

<svelte:head>
	<title>Open {data.destinationName}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
	<section class="w-full max-w-lg border-y border-border py-10 text-center">
		<SmartphoneIcon class="mx-auto size-10 text-primary" aria-hidden="true" />
		<p class="mt-4 text-sm text-muted-foreground">{data.campaignName}</p>
		<h1 class="mt-1 text-2xl font-semibold">Open {data.destinationName}</h1>
		<p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
			{#if data.plan.isWebView}
				Your in-app browser may ask for permission. Use the button below if the app does not open.
			{:else if data.plan.platform === 'web'}
				This destination will continue in your browser.
			{:else}
				We are opening the installed app. If unavailable, you will continue to the app store.
			{/if}
		</p>

		<button
			type="button"
			class="mt-7 inline-flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
			onclick={openApp}
		>
			<ExternalLinkIcon class="size-4" />
			{launching ? 'Opening...' : data.plan.platform === 'web' ? 'Continue' : 'Open app'}
		</button>
		{#if data.plan.storeUrl}
			<a
				href={data.plan.storeUrl}
				class="mx-auto mt-3 flex h-9 w-fit items-center justify-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
				rel="noreferrer"
			>
				<StoreIcon class="size-4" /> Open app store
			</a>
		{/if}
		<a
			href={data.plan.webUrl}
			class="mt-3 block text-xs text-muted-foreground underline underline-offset-4"
			rel="noreferrer">Continue on the web</a
		>
	</section>
</main>
