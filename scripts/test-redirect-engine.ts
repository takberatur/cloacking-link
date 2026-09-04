import assert from 'node:assert/strict';
import { detectVisitor, extractClientIp } from '../src/lib/server/redirect/visitor.ts';
import {
	evaluateRules,
	ruleMatches,
	safeExternalUrl,
	withQueryParams
} from '../src/lib/server/redirect/rules.ts';
import { selectDestination, stableHash } from '../src/lib/server/redirect/rotation.ts';
import type { EvaluatedRule, VisitorContext } from '../src/lib/server/redirect/types.ts';

const mobileHeaders = new Headers({
	'cf-connecting-ip': '203.0.113.42',
	'cf-ipcountry': 'id',
	'user-agent':
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
	'accept-language': 'id-ID,id;q=0.9',
	referer: 'https://social.example/post'
});
const visitor = detectVisitor(mobileHeaders, '127.0.0.1');
assert.equal(visitor.ip, '203.0.113.42');
assert.equal(visitor.countryCode, 'ID');
assert.equal(visitor.deviceType, 'mobile');
assert.equal(visitor.os, 'Android');
assert.equal(visitor.browser, 'Chrome');
assert.equal(visitor.isBot, false);
assert.deepEqual(
	extractClientIp(new Headers({ 'x-forwarded-for': '::ffff:192.0.2.5, 10.0.0.1' })),
	'192.0.2.5'
);

const bot = detectVisitor(new Headers({ 'user-agent': 'Googlebot/2.1' }));
assert.equal(bot.isBot, true);
assert.equal(bot.botScore, 100);

const baseRule: EvaluatedRule = {
	id: 'rule-1',
	type: 'country',
	operator: 'in',
	action: 'block',
	value: 'US, ID',
	redirectUrl: null
};
assert.equal(ruleMatches(baseRule, visitor), true);
assert.equal(
	ruleMatches(
		{ ...baseRule, type: 'ip_range', operator: 'cidr', value: '203.0.113.0/24' },
		visitor
	),
	true
);
assert.equal(
	ruleMatches(
		{ ...baseRule, type: 'ip_range', operator: 'cidr', value: '2001:db8::/32' },
		{ ...visitor, ip: '2001:db8:1234::10' }
	),
	true
);
assert.deepEqual(
	evaluateRules(
		[
			{ ...baseRule, id: 'allow-id', action: 'allow', value: 'ID' },
			{ ...baseRule, id: 'block-id', action: 'block', value: 'ID' }
		],
		visitor
	),
	{
		matched: true,
		action: 'allow',
		rule: { ...baseRule, id: 'allow-id', action: 'allow', value: 'ID' }
	}
);

assert.equal(safeExternalUrl('javascript:alert(1)'), null);
assert.equal(
	withQueryParams('https://offer.example/path?source=affiliate', {
		source: 'incoming',
		utm_campaign: 'spring',
		tag: ['one', 'two']
	}),
	'https://offer.example/path?source=affiliate&utm_campaign=spring&tag=one&tag=two'
);

const candidates = [
	{ id: 'a', weight: 20, priority: 1, position: 0 },
	{ id: 'b', weight: 80, priority: 2, position: 1 }
];
assert.equal(
	selectDestination(candidates, 'equal', 'visitor-a'),
	selectDestination(candidates, 'equal', 'visitor-a')
);
assert.equal(selectDestination(candidates, 'priority', 'visitor-a')?.id, 'a');

const weightedCounts = { a: 0, b: 0 };
for (let index = 0; index < 10_000; index += 1) {
	const selected = selectDestination(candidates, 'percentage', `visitor-${index}`);
	if (selected) weightedCounts[selected.id as keyof typeof weightedCounts] += 1;
}
assert.ok(weightedCounts.a > 1_500 && weightedCounts.a < 2_500, JSON.stringify(weightedCounts));
assert.ok(weightedCounts.b > 7_500 && weightedCounts.b < 8_500, JSON.stringify(weightedCounts));
assert.equal(stableHash('same-key'), stableHash('same-key'));

const unknownVisitor: VisitorContext = { ...visitor, countryCode: null };
assert.equal(
	ruleMatches({ ...baseRule, operator: 'not_in', value: 'US,ID' }, unknownVisitor),
	true
);

console.log('Redirect engine unit tests passed', weightedCounts);
