<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { AppNavMain, AppNavUser } from '$lib/components/app/index.js';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { LayoutDashboard, UserRound, Settings, Link } from '@lucide/svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		user,
		setting,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		user?: User | null;
		setting?: SiteSetting | null;
	} = $props();

	const sidebar = useSidebar();
	let isMobilePage = new IsMobile();

	const navMenu = {
		primary: [
			{
				title: 'Dashboard',
				url: '/app',
				icon: LayoutDashboard
			},
			{
				title: 'Links',
				url: '/app/links',
				icon: Link
			},
			{
				title: 'Users',
				url: '/app/users',
				icon: UserRound
			}
		] as NavMenu[],
		secondary: [
			{
				title: 'Settings',
				url: '/app/settings',
				icon: Settings
			}
		] as NavMenu[]
	};
</script>

<Sidebar.Root bind:ref collapsible="icon" {...restProps}>
	<Sidebar.Root collapsible="none" class="w-[calc(var(--sidebar-width-icon)+1px)]! border-e">
		<Sidebar.Header>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
						{#snippet child({ props })}
							<a href="/app" {...props}>
								{#if isMobilePage.current}
									<img
										src={setting?.site_logo || '/logo.png'}
										alt={setting?.site_name || 'Link Shift'}
										class="h-10 w-10 object-cover"
									/>
									<div class="text-left">
										<p
											class="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase"
										>
											{setting?.site_name || 'Link Shift'}
										</p>
										<p class="text-xs text-foreground/80">{setting?.site_tagline || ''}</p>
									</div>
								{:else}
									<img
										src={setting?.site_logo || '/logo.png'}
										alt={setting?.site_name || 'Link Shift'}
										class="aspect-square size-7 object-cover select-none"
									/>
								{/if}
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Header>
		<Sidebar.Content class="scrollbar-primary overflow-y-auto">
			<AppNavMain items={navMenu.primary} />
			<Sidebar.Separator />
			<AppNavMain items={navMenu.secondary} />
		</Sidebar.Content>
		<Sidebar.Footer>
			<AppNavUser {user} />
		</Sidebar.Footer>
		<Sidebar.Rail />
	</Sidebar.Root>
</Sidebar.Root>
