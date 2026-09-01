<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { LightSwitch } from '$lib/components/ui/light-switch';
	import { cn } from '$lib/utils.js';
	import { Bell } from '@lucide/svelte';

	let { page, lang }: { page?: string; lang?: string } = $props();

</script>

<header
	class={cn(
		'flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
		'sticky top-0 z-50 overflow-hidden rounded-t-[inherit] bg-background/50 backdrop-blur-md'
	)}
>
	<div class="flex justify-between items-center px-4 w-full lg:px-6">
		<div class="flex gap-1 items-center lg:gap-2">
			<Sidebar.Trigger class="-ml-1 lg:hidden" />
			<h1 class="text-base font-medium">{page}</h1>
		</div>

		<div class="flex gap-2 items-center">
			<Button variant="outline" size="icon">
				<Bell />
			</Button>
			<LightSwitch />
		</div>
	</div>
</header>
