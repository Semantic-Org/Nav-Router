// html-level touches the markdown can't express: tables scroll inside a frame, h2/h3 get anchor
// links, and answers in a truth table are tinted words.

const LINK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

function walk(node, fn, parent = null, index = 0) {
  fn(node, parent, index);
  // iterate a copy: fn may replace a child in place
  (node.children ?? []).slice().forEach((child, i) => walk(child, fn, node, i));
}

export function rehypeDocs() {
  return (tree) => {
    walk(tree, (node, parent, index) => {
      if (node.type !== 'element') { return; }

      // search reads prose: code blocks, signatures and table headers would run together in an excerpt
      const cls = node.properties?.className ?? [];
      if (
        (node.tagName === 'div' && cls.includes('code')) || (node.tagName === 'pre' && cls.includes('signature'))
        || node.tagName === 'thead'
      ) {
        node.properties.dataPagefindIgnore = '';
      }

      if (node.tagName === 'table' && parent && !(parent.properties?.className ?? []).includes('table-wrap')) {
        // a table of rows stacks on narrow screens; a truth table is a grid read across, so it stays
        if (!(parent.properties?.className ?? []).includes('truth')) {
          node.properties = { ...node.properties, className: [...(node.properties?.className ?? []), 'stacks'] };
        }
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['table-wrap'] },
          children: [node],
        };
      }

      if ((node.tagName === 'h2' || node.tagName === 'h3') && node.properties?.id) {
        node.children.push({
          type: 'element',
          tagName: 'a',
          properties: {
            className: ['anchor'],
            href: `#${node.properties.id}`,
            ariaLabel: `Link to ${textOf(node).trim()}`,
          },
          children: [{ type: 'raw', value: LINK_ICON }],
        });
      }
    });

    walk(tree, (node) => {
      if (node.type !== 'element') { return; }
      const cls = node.properties?.className ?? [];

      // a table's Type column is read as types: violet, never syntax-highlighted
      if (node.tagName === 'table') {
        const ths = [];
        walk(node, (n) => {
          if (n.type === 'element' && n.tagName === 'th') { ths.push(textOf(n).trim()); }
        });
        // each cell carries its column's name, the label a stacked row shows beside it
        walk(node, (row) => {
          if (row.type !== 'element' || row.tagName !== 'tr') { return; }
          row.children.filter((c) => c.type === 'element' && c.tagName === 'td').forEach((td, i) => {
            td.properties.dataLabel = ths[i];
          });
        });
        const col = ths.indexOf('Type');
        if (col >= 0) {
          walk(node, (row) => {
            if (row.type !== 'element' || row.tagName !== 'tr') { return; }
            const cells = row.children.filter((c) => c.type === 'element' && c.tagName === 'td');
            walk(cells[col] ?? { children: [] }, (c) => {
              if (c.type === 'element' && c.tagName === 'code') {
                c.properties.className = [...(c.properties.className ?? []), 't'];
              }
            });
          });
        }
      }

      // in a reference entry, a paragraph that is only bold text labels what follows
      if (node.tagName === 'section' && cls.includes('entry')) {
        node.children.forEach((child) => {
          const kids = (child.children ?? []).filter((k) => !(k.type === 'text' && !k.value.trim()));
          if (child.tagName === 'p' && kids.length === 1 && kids[0].tagName === 'strong') {
            child.properties = { className: ['entry-label'] };
            child.children = kids[0].children;
          }
        });
      }
    });

    // inside a truth table, a cell that says true or false becomes a tinted word
    walk(tree, (node) => {
      if (node.type !== 'element' || !(node.properties?.className ?? []).includes('truth')) { return; }
      walk(node, (cell) => {
        if (cell.type !== 'element' || cell.tagName !== 'td') { return; }
        const text = textOf(cell).trim();
        if (text === 'true' || text === 'false') {
          cell.children = [{
            type: 'element',
            tagName: 'span',
            properties: { className: [text === 'true' ? 'yes' : 'no'] },
            children: [{ type: 'text', value: text }],
          }];
        }
      });
    });
  };
}
