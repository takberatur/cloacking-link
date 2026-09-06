<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@lucide/svelte';
	let { data } = $props();
	const pageUrl = (page: number) =>
		`/app/audit?${new URLSearchParams({ q: data.query, page: String(page), pageSize: String(data.logs.pageSize) })}`;
	const summary = (meta: unknown) => {
		if (!meta || typeof meta !== 'object') return '—';
		const text = Object.entries(meta as Record<string, unknown>)
			.map(([key, value]) => `${key}: ${String(value)}`)
			.join(' · ');
		return text || '—';
	};
</script>

<AppSidebarLayout page="Audit log" user={data.user} setting={data.setting}>
	<div class="space-y-5 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<p class="text-sm text-muted-foreground">Administration</p>
			<h1 class="mt-1 text-2xl font-semibold">Audit log</h1>
			<p class="mt-1 text-sm text-muted-foreground">{data.logs.total} recorded actions</p>
		</header>
		<form method="GET" class="flex gap-3 border-b border-border pb-5">
			<div class="relative min-w-0 flex-1">
				<SearchIcon
					class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
				/><Input
					name="q"
					value={data.query}
					placeholder="Search action, actor, or target"
					class="pl-9"
				/>
			</div>
			<Button type="submit">Search</Button>
		</form>
		<div class="overflow-x-auto border border-border">
			<table class="w-full min-w-[820px] text-sm">
				<thead class="bg-muted/50 text-left text-xs text-muted-foreground uppercase"
					><tr
						><th class="px-4 py-3">Time</th><th class="px-4 py-3">Actor</th><th class="px-4 py-3"
							>Action</th
						><th class="px-4 py-3">Target</th><th class="px-4 py-3">Details</th></tr
					></thead
				><tbody class="divide-y divide-border"
					>{#each data.logs.items as log (log.id)}<tr
							><td class="px-4 py-3 whitespace-nowrap text-muted-foreground"
								>{new Date(log.createdAt).toLocaleString()}</td
							><td class="px-4 py-3"
								><div class="font-medium">{log.actorName ?? 'System'}</div>
								<div class="text-xs text-muted-foreground">
									{log.actorEmail ?? log.actorId ?? 'Automated'}
								</div></td
							><td class="px-4 py-3 font-mono text-xs">{log.action}</td><td class="px-4 py-3"
								><div>{log.targetType ?? '—'}</div>
								<div class="max-w-48 truncate font-mono text-xs text-muted-foreground">
									{log.targetId ?? '—'}
								</div></td
							><td
								class="max-w-72 truncate px-4 py-3 text-xs text-muted-foreground"
								title={summary(log.meta)}>{summary(log.meta)}</td
							></tr
						>{:else}<tr
							><td colspan="5" class="px-4 py-10 text-center text-muted-foreground"
								>No audit entries found.</td
							></tr
						>{/each}</tbody
				>
			</table>
		</div>
		<footer class="flex items-center justify-between text-sm text-muted-foreground">
			<span>Page {data.logs.page} of {data.logs.totalPages}</span>
			<div class="flex gap-2">
				<Button
					href={pageUrl(data.logs.page - 1)}
					size="icon"
					variant="outline"
					disabled={data.logs.page <= 1}
					aria-label="Previous page"><ChevronLeftIcon /></Button
				><Button
					href={pageUrl(data.logs.page + 1)}
					size="icon"
					variant="outline"
					disabled={data.logs.page >= data.logs.totalPages}
					aria-label="Next page"><ChevronRightIcon /></Button
				>
			</div>
		</footer>
	</div>
</AppSidebarLayout>
