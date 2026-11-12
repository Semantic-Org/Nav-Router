// a live example: the playground engine builds and serves the files, its editor edits them, and the
// preview runs the app in a browser bar that follows the app's own navigations.
// one per [data-playground]; the files come in a json script beside it

import { PlaygroundPreview, PlaygroundProject } from '@semantic-ui/playground';
import { createEditor } from '@semantic-ui/playground/editor';

import { IMPORT_MAP } from './playground-imports.js';
import { ui } from './strings.js';

// the editor in the site's code colors: the same tokens the code blocks and shiki use, so a live
// example reads like every other sample, in both themes
const EDITOR_THEME = `
  /* nested under .cm-editor, as next/docs' codemirror.css does: two classes deep, so it ties
     codemirror's base theme and wins by coming later */
  .cm-editor {
    height: 100%; background: var(--code-bg); color: var(--text);
    &.cm-focused { outline: none; }
    /* the padding sits on the scroller so the gutter and the code start on the same line */
    .cm-scroller {
      padding: 12px 0;
      font-family: var(--font-mono); font-size: var(--code-fs); line-height: var(--code-lh);
      font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'calt' 0;
    }
    .cm-content { padding: 0; caret-color: var(--accent); }
    .cm-line { padding: 0 20px 0 12px; }
    .cm-gutters { background: var(--code-bg); color: var(--text-4); border-right: 1px solid var(--line); }
    .cm-lineNumbers .cm-gutterElement { padding: 0 10px 0 14px; min-width: 32px; }
    .cm-activeLine { background: color-mix(in oklab, var(--accent) 5%, transparent); }
    .cm-activeLineGutter { background: transparent; color: var(--text-2); }
    .cm-cursor, .cm-dropCursor { border-left: 2px solid var(--accent); }
    .cm-selectionBackground, &.cm-focused .cm-selectionBackground { background: color-mix(in oklab, var(--accent) 22%, transparent); }
    .cm-matchingBracket { background: var(--surface-3); outline: 1px solid var(--line-3); }
    .cm-foldPlaceholder { background: var(--surface-3); border: 0; color: var(--text-3); }
    .tok-keyword, .tok-operatorKeyword, .tok-controlKeyword, .tok-moduleKeyword { color: var(--c-coral); }
    .tok-string, .tok-string2, .tok-special.tok-string { color: var(--c-string); }
    .tok-comment, .tok-lineComment, .tok-blockComment { color: var(--c-comment); font-style: italic; }
    .tok-number, .tok-bool, .tok-null, .tok-atom { color: var(--c-blue); }
    .tok-propertyName, .tok-attributeName { color: var(--c-blue); }
    .tok-variableName.tok-definition, .tok-function, .tok-variableName2 { color: var(--c-violet); }
    .tok-typeName, .tok-className, .tok-tagName { color: var(--c-green); }
    .tok-punctuation, .tok-operator, .tok-bracket { color: var(--text-2); }

    /* find and replace (ctrl/cmd+f): the panel on the code header's surface, fields in the code's
       face, quiet buttons, the find and replace rows kept on lines of their own. scoped as
       codemirror scopes its own search styles, so these win by coming later */
    .cm-panels { background: var(--code-head); color: var(--text-2); }
    .cm-panels-top { border-bottom: 1px solid var(--line); }
    .cm-panel.cm-search {
      position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 10px 44px 10px 12px; font: 400 var(--fs-xs)/var(--lh-xs) var(--font-sans);
    }
    .cm-panel.cm-search br { display: block; flex-basis: 100%; height: 0; content: ''; }
    .cm-panel.cm-search .cm-textfield {
      width: 220px; height: 28px; margin: 0; padding: 0 10px;
      border: 1px solid var(--line-2); border-radius: var(--r-2); background: var(--bg); color: var(--text);
      font: 400 var(--code-fs)/1 var(--font-mono);
    }
    .cm-panel.cm-search .cm-textfield:focus { outline: none; border-color: var(--accent); }
    .cm-panel.cm-search .cm-button {
      height: 28px; margin: 0; padding: 0 10px;
      border: 1px solid var(--line-2); border-radius: var(--r-2); background: var(--surface-2); background-image: none;
      color: var(--text-2); font: 500 var(--fs-xs)/1 var(--font-sans); cursor: pointer;
    }
    .cm-panel.cm-search .cm-button:hover { color: var(--text); background: var(--surface-3); }
    .cm-panel.cm-search label { display: inline-flex; align-items: center; gap: 6px; color: var(--text-3); font-size: var(--fs-xs); }
    .cm-panel.cm-search input[type=checkbox] { margin: 0; accent-color: var(--accent); }
    .cm-panel.cm-search button[name=close] {
      position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 28px; height: 28px;
      border: 0; border-radius: var(--r-2); background: none; color: var(--text-3); font-size: 18px; line-height: 1; cursor: pointer;
    }
    .cm-panel.cm-search button[name=close]:hover { color: var(--text); background: var(--surface-3); }
    .cm-searchMatch { background: color-mix(in oklab, var(--accent) 22%, transparent); outline: 1px solid var(--accent-line); }
    .cm-searchMatch.cm-searchMatch-selected { background: color-mix(in oklab, var(--accent) 45%, transparent); }
  }
`;

export function mountPlayground(root) {
  const { files: FILES, tabs: TABS } = JSON.parse(root.querySelector('[data-pg-files]').textContent);
  const $ = (s) => root.querySelector(s);
  const status = $('[data-pg-status]');
  const pathEl = $('[data-pg-path]');
  const back = $('[data-pg-back]');
  const forward = $('[data-pg-forward]');
  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  };

  // the frame is made here, not parsed with the page: the browser restores a parsed frame's last
  // url on reload and back/forward, which would be a dead session's deep path
  const frame = document.createElement('iframe');
  frame.className = 'pg-frame';
  frame.title = ui('playground.preview');
  $('[data-pg-frame]').replaceWith(frame);

  // the app owns its urls, so any path without a file serves index.html: reloads and deep links land
  // in the app, and its router takes it from there
  const project = new PlaygroundProject({ files: FILES, importMap: IMPORT_MAP, fallback: 'index.html' });
  root.project = project;

  let started = 0;
  project.on('buildStart', () => {
    started = performance.now();
    say(ui('playground.building'));
  });
  project.on('buildError', (error) => say(ui('playground.buildError', { message: error.message }), true));
  project.on('buildDone', () => say(ui('playground.built', { ms: Math.round(performance.now() - started) })));

  // the preview follows the app through the playground's bridge: where it is, whether it can go
  // back or forward, what it throws. it reloads in place after every build, on the same route
  const preview = new PlaygroundPreview({ project, frame, path: '/' });
  preview.on('navigate', ({ path, canGoBack, canGoForward }) => {
    // the router's base is the session path, so it shows up encoded inside query values too (a
    // guard's returnTo); the bar shows the app's own urls
    const base = encodeURIComponent(new URL(project.previewUrl, location.origin).pathname.replace(/\/$/, ''));
    pathEl.textContent = path.split(base).join('');
    back.disabled = !canGoBack;
    forward.disabled = !canGoForward;
  });
  preview.on('error', ({ message }) => say(ui('playground.runtimeError', { message }), true));
  back.addEventListener('click', () => preview.back());
  forward.addEventListener('click', () => preview.forward());
  $('[data-pg-reload]').addEventListener('click', () => preview.reload());

  // the static copy of the first file stands in only until the editor is here
  root.querySelector('[data-pg-static]')?.remove();

  // the editor: one tab per file, edits rebuild the preview
  const tabs = $('[data-pg-tabs]');
  const editor = createEditor({
    parent: $('[data-pg-editor]'),
    // hidden setup lines don't leave a gap in the numbering
    lineNumbers: root.dataset.lineNumbers === 'off' ? false : 'continuous',
    theme: EDITOR_THEME,
    onChange: (name, content) => {
      project.editFile(name, content);
      project.buildCoalesced();
    },
  });
  const open = (name) => {
    editor.openFile(name, project.getFile(name)?.content ?? FILES[name]);
    tabs.querySelectorAll('[role=tab]').forEach((t) => {
      const on = t.dataset.file === name;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
  };
  tabs.innerHTML = TABS.map((name) =>
    `<button class="code-tab" role="tab" type="button" data-file="${name}">${name}</button>`
  ).join('');
  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('[data-file]');
    if (t) { open(t.dataset.file); }
  });
  // arrow keys move between files, as in any tablist
  tabs.addEventListener('keydown', (e) => {
    const all = [...tabs.querySelectorAll('[role=tab]')];
    const i = all.indexOf(document.activeElement);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (i < 0 || to === undefined) { return; }
    e.preventDefault();
    const t = all[(to + all.length) % all.length];
    open(t.dataset.file);
    t.focus();
  });
  open(TABS[0]);

  project.build();
}
