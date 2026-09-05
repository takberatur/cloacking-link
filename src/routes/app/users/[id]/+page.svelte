<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeftIcon, BanIcon, SaveIcon, ShieldCheckIcon, Undo2Icon } from '@lucide/svelte';

	let { data, form } = $props();
	const account = $derived(data.managedUser.account);
	const assigned = $derived(new Set(data.managedUser.assignedPermissions.map((item) => item.id)));
	const canManage = $derived(
		data.user?.role === 'superadmin' || (data.user?.role === 'moderator' && account.role === 'user')
	);
</script>

<AppSidebarLayout page="User detail" user={data.user} setting={data.setting}>
	<div class="mx-auto w-full max-w-5xl space-y-6 px-1 sm:px-3">
		<header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
			<div>
				<a
					href="/app/users"
					class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					><ArrowLeftIcon class="size-4" /> Users</a
				>
				<h1 class="mt-2 text-2xl font-semibold">{account.name}</h1>
				<p class="mt-1 text-sm text-muted-foreground">{account.email}</p>
			</div>
			<span
				class="rounded px-2.5 py-1 text-xs font-medium {account.banned
					? 'bg-destructive/10 text-destructive'
					: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}"
				>{account.banned ? 'Banned' : account.status}</span
			>
		</header>

		{#if form?.error}<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				{form.error}
			</div>{/if}

		<section class="grid gap-4 border-b border-border pb-6 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<p class="text-xs text-muted-foreground">Username</p>
				<p class="mt-1 text-sm font-medium">{account.username ?? 'Not set'}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Email</p>
				<p class="mt-1 text-sm font-medium">{account.emailVerified ? 'Verified' : 'Unverified'}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Two-factor</p>
				<p class="mt-1 text-sm font-medium">{account.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Created</p>
				<p class="mt-1 text-sm font-medium">{new Date(account.createdAt).toLocaleString()}</p>
			</div>
		</section>

		{#if data.user?.role === 'superadmin'}
			<section class="border-b border-border pb-6">
				<h2 class="text-base font-semibold">Role</h2>
				<form method="POST" action="?/role" class="mt-4 flex max-w-md gap-3">
					<select
						name="role"
						class="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
						value={account.role}
						disabled={data.user.id === account.id}
						><option value="user">User</option><option value="moderator">Moderator</option><option
							value="superadmin">Superadmin</option
						></select
					><Button type="submit" disabled={data.user.id === account.id}
						><ShieldCheckIcon data-icon="inline-start" /> Update role</Button
					>
				</form>
			</section>

			<section class="border-b border-border pb-6">
				<h2 class="text-base font-semibold">Permissions</h2>
				<form method="POST" action="?/permissions" class="mt-4">
					<div class="grid gap-2 sm:grid-cols-2">
						{#each data.managedUser.allPermissions as permission (permission.id)}<label
								class="flex items-start gap-3 border border-border px-3 py-3 text-sm"
								><input
									type="checkbox"
									name="permissionId"
									value={permission.id}
									checked={assigned.has(permission.id)}
									class="mt-0.5 size-4"
								/><span
									><span class="block font-medium">{permission.code}</span><span
										class="text-xs text-muted-foreground">{permission.description}</span
									></span
								></label
							>{/each}
					</div>
					<Button type="submit" class="mt-4"
						><SaveIcon data-icon="inline-start" /> Save permissions</Button
					>
				</form>
			</section>
		{/if}

		<section>
			<h2 class="text-base font-semibold">Account access</h2>
			{#if canManage && data.user?.id !== account.id}<form
					method="POST"
					action="?/ban"
					class="mt-4 max-w-xl space-y-3"
				>
					<input
						type="hidden"
						name="banned"
						value={account.banned ? 'false' : 'true'}
					/>{#if !account.banned}<Input
							name="reason"
							maxlength={500}
							placeholder="Reason for suspension"
							required
						/>{/if}<Button type="submit" variant={account.banned ? 'outline' : 'destructive'}
						>{#if account.banned}<Undo2Icon data-icon="inline-start" /> Restore access{:else}<BanIcon
								data-icon="inline-start"
							/> Ban and revoke sessions{/if}</Button
					>
				</form>{:else}<p class="mt-2 text-sm text-muted-foreground">
					This account cannot be managed with your current role.
				</p>{/if}
		</section>
	</div>
</AppSidebarLayout>
