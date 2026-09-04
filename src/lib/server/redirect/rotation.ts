import type { RotationCandidate } from './types';

export type RotationStrategy = 'equal' | 'percentage' | 'priority';

export function stableHash(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function sorted(candidates: RotationCandidate[]): RotationCandidate[] {
	return [...candidates].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

export function selectDestination<T extends RotationCandidate>(
	candidates: T[],
	strategy: RotationStrategy,
	visitorKey: string
): T | null {
	if (candidates.length === 0) return null;
	let pool = sorted(candidates) as T[];

	if (strategy === 'priority') {
		const highestPriority = Math.min(...pool.map((candidate) => candidate.priority));
		pool = pool.filter((candidate) => candidate.priority === highestPriority);
	}

	const bucket = stableHash(visitorKey);
	if (strategy !== 'percentage') return pool[bucket % pool.length];

	const totalWeight = pool.reduce((total, candidate) => total + Math.max(0, candidate.weight), 0);
	if (totalWeight <= 0) return pool[bucket % pool.length];

	let cursor = bucket % totalWeight;
	for (const candidate of pool) {
		cursor -= Math.max(0, candidate.weight);
		if (cursor < 0) return candidate;
	}
	return pool.at(-1) ?? null;
}
