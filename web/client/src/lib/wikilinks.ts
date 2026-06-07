/**
 * Remark plugin to parse [[wiki links]] in markdown and convert them to
 * HTML links. The resulting <a> tags have a data-wikilink attribute with
 * the link text, which the Preview component uses to navigate in-app.
 */
import type { Root, Text, Link } from 'mdast';

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Remark plugin: replaces [[Note Name]] with link nodes.
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree);
  };
}

function visit(node: Root | Link | { children?: unknown[] }) {
  if (!('children' in node) || !Array.isArray(node.children)) return;

  const newChildren: unknown[] = [];

  for (const child of node.children) {
    if ((child as { type: string }).type === 'text') {
      const textNode = child as Text;
      const parts = splitWikiLinks(textNode.value);
      newChildren.push(...parts);
    } else {
      visit(child as Root);
      newChildren.push(child);
    }
  }

  node.children = newChildren;
}

function splitWikiLinks(text: string): Array<Text | Link> {
  const parts: Array<Text | Link> = [];
  let lastIndex = 0;

  // Reset lastIndex for global regex
  WIKI_LINK_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      parts.push({ type: 'text', value: before });
    }

    const linkText = match[1].trim();
    parts.push({
      type: 'link',
      url: `wikilink://${encodeURIComponent(linkText)}`,
      children: [{ type: 'text', value: linkText }],
      data: {
        hProperties: {
          'data-wikilink': linkText,
          className: 'wikilink',
        },
      },
    } as Link);

    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) {
    parts.push({ type: 'text', value: after });
  }

  // If nothing matched, return original
  if (parts.length === 0) {
    parts.push({ type: 'text', value: text });
  }

  return parts;
}
