import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../extension/src/ui/renderMarkdown.js';

test('escapes raw HTML so page text cannot inject markup', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('renders bold and italic', () => {
  assert.equal(renderMarkdown('**a** and *b*'), '<p><strong>a</strong> and <em>b</em></p>');
});

test('keeps inline code verbatim', () => {
  assert.equal(renderMarkdown('run `**x** <y>`'), '<p>run <code>**x** &lt;y&gt;</code></p>');
});

test('renders fenced code block escaped', () => {
  assert.equal(renderMarkdown('```js\n<b>\n  **x**\n```'), '<pre><code>&lt;b&gt;\n  **x**</code></pre>');
});

test('renders bullet and numbered lists', () => {
  assert.equal(
    renderMarkdown('- a\n* **b**\n\n1. c\n2) d'),
    '<ul><li>a</li><li><strong>b</strong></li></ul><ol><li>c</li><li>d</li></ol>',
  );
});

test('renders headings smaller than popup title size', () => {
  assert.equal(renderMarkdown('# A\n## B\n### C'), '<h3>A</h3><h4>B</h4><h5>C</h5>');
});

test('renders http links and drops unsafe ones', () => {
  assert.equal(
    renderMarkdown('[x](https://a.b/?q=1&r=2)'),
    '<p><a href="https://a.b/?q=1&amp;r=2" target="_blank" rel="noopener">x</a></p>',
  );
  assert.ok(!renderMarkdown('[x](javascript:alert(1))').includes('<a'));
});

test('joins lines into paragraphs split by blank lines', () => {
  assert.equal(renderMarkdown('a\nb\n\nc'), '<p>a<br>b</p><p>c</p>');
});

test('renders horizontal rule', () => {
  assert.equal(renderMarkdown('a\n\n---\n\nb'), '<p>a</p><hr><p>b</p>');
});

test('does not italicize snake_case or lone asterisks', () => {
  assert.equal(renderMarkdown('2 * 3 * 4 and my_var_name'), '<p>2 * 3 * 4 and my_var_name</p>');
});
