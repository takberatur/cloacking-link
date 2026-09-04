<script lang="ts">
	import { ArrowRight, ShieldCheck } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Continue to {data.campaignName}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
	<section class="w-full max-w-xl border-y border-border py-12 text-center">
		<ShieldCheck class="mx-auto mb-5 size-10 text-primary" aria-hidden="true" />
		<p class="mb-2 text-sm font-medium text-muted-foreground">Destination ready</p>
		<h1 class="text-3xl font-semibold">{data.campaignName}</h1>
		<p class="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
			Continue when you are ready. The destination will open in this tab.
		</p>
		<a
			href={data.targetUrl}
			class="mt-8 inline-flex h-10 items-center justify-center gap-2 bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			rel="noreferrer"
		>
			Continue <ArrowRight class="size-4" aria-hidden="true" />
		</a>
	</section>
</main>
