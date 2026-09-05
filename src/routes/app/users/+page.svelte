<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, UserRoundIcon } from '@lucide/svelte';

	let { data } = $props();
	const pageUrl = (page: number) => {
		const params = new URLSearchParams();
		if (data.filters.query) params.set('q', data.filters.query);
		if (data.filters.role) params.set('role', data.filters.role);
		if (data.filters.status) params.set('status', data.filters.status);
		params.set('page', String(page));
		params.set('pageSize', String(data.users.pageSize));
		return `/app/users?${params}`;
	};
</script>

<AppSidebarLayout page="User management" user={data.user} setting={data.setting}>
	<div class="mx-auto w-full max-w-7xl space-y-5 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<p class="text-sm text-muted-foreground">Administration</p>
			<h1 class="mt-1 text-2xl font-semibold">Users</h1>
			<p class="mt-1 text-sm text-muted-foreground">{data.users.total} accounts</p>
		</header>
		<form
			method="GET"
			class="grid gap-3 border-b border-border pb-5 md:grid-cols-[1fr_180px_180px_auto]"
		>
			<div class="relative">
				<SearchIcon
					class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
				/><Input
					name="q"
					value={data.filters.query}
					placeholder="Search name, email, username"
					class="pl-9"
				/>
			</div>
			<select
				name="role"
				class="h-9 rounded-md border border-input bg-background px-3 text-sm"
				value={data.filters.role}
				><option value="">All roles</option><option value="user">User</option><option
					value="moderator">Moderator</option
				><option value="superadmin">Superadmin</option></select
			>
			<select
				name="status"
				class="h-9 rounded-md border border-input bg-background px-3 text-sm"
				value={data.filters.status}
				><option value="">All statuses</option><option value="active">Active</option><option
					value="inactive">Inactive</option
				><option value="banned">Banned</option></select
			>
			<Button type="submit">Filter</Button>
		</form>
		<div class="overflow-x-auto border border-border">
			<table class="w-full min-w-[760px] text-sm">
				<thead class="bg-muted/50 text-left text-xs text-muted-foreground uppercase"
					><tr
						><th class="px-4 py-3">User</th><th class="px-4 py-3">Role</th><th class="px-4 py-3"
							>Status</th
						><th class="px-4 py-3">Security</th><th class="px-4 py-3">Joined</th><th
							class="px-4 py-3 text-right">Action</th
						></tr
					></thead
				>
				<tbody class="divide-y divide-border">
					{#each data.users.items as item (item.id)}
						<tr class="hover:bg-muted/30"
							><td class="px-4 py-3"
								><div class="font-medium">{item.name}</div>
								<div class="text-xs text-muted-foreground">{item.email}</div></td
							><td class="px-4 py-3 capitalize">{item.role}</td><td class="px-4 py-3"
								><span
									class="inline-flex rounded px-2 py-1 text-xs font-medium {item.banned
										? 'bg-destructive/10 text-destructive'
										: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}"
									>{item.banned ? 'Banned' : item.status}</span
								></td
							><td class="px-4 py-3 text-muted-foreground"
								>{item.emailVerified ? 'Verified' : 'Unverified'} · {item.twoFactorEnabled
									? '2FA'
									: 'No 2FA'}</td
							><td class="px-4 py-3 text-muted-foreground"
								>{new Date(item.createdAt).toLocaleDateString()}</td
							><td class="px-4 py-3 text-right"
								><Button href={`/app/users/${item.id}`} size="sm" variant="outline"
									><UserRoundIcon data-icon="inline-start" /> Manage</Button
								></td
							></tr
						>
					{:else}<tr
							><td colspan="6" class="px-4 py-10 text-center text-muted-foreground"
								>No users found.</td
							></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<footer class="flex items-center justify-between text-sm text-muted-foreground">
			<span>Page {data.users.page} of {data.users.totalPages}</span>
			<div class="flex gap-2">
				<Button
					href={pageUrl(data.users.page - 1)}
					size="icon"
					variant="outline"
					disabled={data.users.page <= 1}
					aria-label="Previous page"><ChevronLeftIcon /></Button
				><Button
					href={pageUrl(data.users.page + 1)}
					size="icon"
					variant="outline"
					disabled={data.users.page >= data.users.totalPages}
					aria-label="Next page"><ChevronRightIcon /></Button
				>
			</div>
		</footer>
	</div>
</AppSidebarLayout>
