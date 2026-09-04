import assert from 'node:assert/strict';
import {
	parseSafelinkDocument,
	parseSafelinkTheme,
	renderSafelinkDocument
} from '../src/lib/server/safelink-document.ts';

const document = parseSafelinkDocument(
	JSON.stringify({
		root: {
			type: 'root',
			children: [
				{
					type: 'heading',
					tag: 'h1',
					children: [{ type: 'text', text: '<Best offer>', format: 1 }]
				},
				{
					type: 'paragraph',
					children: [
						{ type: 'text', text: 'Open ' },
						{
							type: 'link',
							url: 'javascript:alert(1)',
							children: [{ type: 'text', text: 'this link' }]
						},
						{ type: 'text', text: '<script>alert(1)</script>' }
					]
				},
				{
					type: 'image',
					src: 'https://res.cloudinary.com/demo/image/upload/example.jpg',
					altText: 'Offer'
				}
			]
		}
	})
);

const html = renderSafelinkDocument(document);
assert.match(html, /<h1><strong>&lt;Best offer&gt;<\/strong><\/h1>/);
assert.ok(!html.includes('javascript:'));
assert.ok(!html.includes('<script>'));
assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.match(html, /loading="lazy"/);

const theme = parseSafelinkTheme({
	backgroundColor: 'red',
	accentColor: '#123ABC',
	ctaLabel: '  Shop now  ',
	countdownSeconds: 999
});
assert.equal(theme.backgroundColor, '#ffffff');
assert.equal(theme.accentColor, '#123ABC');
assert.equal(theme.ctaLabel, 'Shop now');
assert.equal(theme.countdownSeconds, 300);

assert.throws(() => parseSafelinkDocument('{"invalid":true}'));
console.log('Safelink document security tests passed.');
