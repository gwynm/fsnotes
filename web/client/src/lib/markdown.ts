import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { remarkWikiLinks } from './wikilinks';

/**
 * Custom sanitize schema that allows data-wikilink attributes and
 * class names we need for wiki links, plus standard markdown elements.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'dataWikilink',
      'className',
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'src',
      'alt',
      'title',
      'loading',
    ],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      'type',
      'checked',
      'disabled',
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      'className',
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      'className',
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'input',
  ],
};

/**
 * Rewrite image and file paths:
 *  - ../i/filename.png  -> /api/images/filename.png
 *  - ../files/filename  -> /api/files/filename
 */
function rewritePaths(html: string): string {
  // Rewrite image src attributes
  html = html.replace(
    /src="\.\.\/i\/([^"]+)"/g,
    (_match, filename) => `src="/api/images/${encodeURIComponent(filename)}"`,
  );
  // Rewrite file href attributes
  html = html.replace(
    /href="\.\.\/files\/([^"]+)"/g,
    (_match, filename) => `href="/api/files/${encodeURIComponent(filename)}" target="_blank" rel="noopener noreferrer"`,
  );
  // Also rewrite wikilink:// URLs to be clickable with data attribute
  html = html.replace(
    /href="wikilink:\/\/([^"]+)"/g,
    (_match, encoded) => `href="#" data-wikilink="${decodeURIComponent(encoded)}"`,
  );
  return html;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiLinks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

/**
 * Render markdown string to HTML.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return rewritePaths(String(result));
}
