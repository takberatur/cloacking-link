import { createQuery, QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

export const queryKeys = {
  all: ['query'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (params: Record<string, any>) => [...queryKeys.lists(), params] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...queryKeys.details(), id] as const,
  infinite: (params: Record<string, any>) => [...queryKeys.all, 'infinite', params] as const,
};

export const videoQueryKeys = {
  all: ['videos'] as const,
  lists: () => [...videoQueryKeys.all, 'list'] as const,
  list: (params: Record<string, any>) => [...videoQueryKeys.lists(), params] as const,
  details: () => [...videoQueryKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...videoQueryKeys.details(), id] as const,
  infinite: (params: Record<string, any>) => [...videoQueryKeys.all, 'infinite', params] as const,
};