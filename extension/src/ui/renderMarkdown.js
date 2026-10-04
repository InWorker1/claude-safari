// Minimal Markdown → HTML for Claude's answers. Everything is escaped first, so the result is safe for innerHTML.
// ponytail: no tables/blockquotes/nested lists — they render as plain text; vendor a full parser if answers need them.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const format = (s) => escape(s)
  .replace(/\*\*(?!\s)(.+?)(?<!\s)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(?!\s)([^*]+?)(?<!\s)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

// Odd segments between backticks are inline code: shown verbatim, no formatting.
const inline = (s) => s.split('`').map((part, i) => (i % 2 ? `<code>${escape(part)}</code>` : format(part))).join('');

export function renderMarkdown(md) {
  const out = [];
  let paragraph = [];
  let list = null;
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const flushCode = () => out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);

  for (const line of md.split('\n')) {
    if (code) {
      if (line.trimStart().startsWith('```')) { flushCode(); code = null; } else code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const item = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.*)$/);

    if (line.trimStart().startsWith('```')) {
      flushParagraph(); closeList();
      code = [];
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph(); closeList();
      out.push('<hr>');
    } else if (heading) {
      flushParagraph(); closeList();
      const level = Math.min(heading[1].length + 2, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      flushParagraph();
      const type = item[1] ? 'ul' : 'ol';
      if (list !== type) { closeList(); out.push(`<${type}>`); list = type; }
      out.push(`<li>${inline(item[2])}</li>`);
    } else if (!line.trim()) {
      flushParagraph(); closeList();
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  if (code) flushCode();
  flushParagraph();
  closeList();
  return out.join('');
}
