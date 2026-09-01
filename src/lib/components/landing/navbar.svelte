<script lang="ts">
	import Logo from './app-logo.svelte';
	import { LightSwitch } from '$lib/components/ui/light-switch/index';
	import { Button } from '$lib/components/ui/button/index';
	import { Menu, X } from '@lucide/svelte';

	let mobileOpen = $state(false);

	const links = [
		{ href: '/#features', label: 'Features' },
		{ href: '/docs', label: 'Documentation' },
		{ href: '/blog', label: 'Blog' },
		{ href: '/faq', label: 'FAQ' }
	];
</script>

<header
	class="sticky top-0 z-50 border-b border-line-light bg-paper/85 backdrop-blur-md dark:border-line-dark dark:bg-ink/85"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
		<Logo />

		<nav class="hidden items-center gap-8 md:flex">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="text-sm font-medium text-slate-500 transition-colors hover:text-ink dark:hover:text-paper"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-3 md:flex">
			<LightSwitch />
			<Button href="/signin" variant="ghost" size="sm">Sign in</Button>
			<Button href="/signup" variant="default" size="sm">Start free</Button>
		</div>

		<div class="flex items-center gap-2 md:hidden">
			<LightSwitch />
			<button
				aria-label="Toggle menu"
				onclick={() => (mobileOpen = !mobileOpen)}
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-light dark:border-line-dark"
			>
				{#if mobileOpen}<X size={16} />{:else}<Menu size={16} />{/if}
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<div class="border-t border-line-light px-5 py-4 md:hidden dark:border-line-dark">
			<nav class="flex flex-col gap-3">
				{#each links as link (link.href)}
					<a
						href={link.href}
						class="text-sm font-medium text-slate-500"
						onclick={() => (mobileOpen = false)}
					>
						{link.label}
					</a>
				{/each}
				<div class="mt-2 flex gap-3">
					<Button href="/signin" variant="outline" size="sm" class="flex-1">Sign in</Button>
					<Button href="/signup" variant="default" size="sm" class="flex-1">Start free</Button>
				</div>
			</nav>
		</div>
	{/if}
</header>
