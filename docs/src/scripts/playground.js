// a live example: the playground engine builds and serves the files, its editor edits them, and the
// preview runs the app in a browser bar that follows the app's own navigations.
// one per [data-playground]; the files come in a json script beside it

import { PlaygroundPreview, PlaygroundProject } from '@semantic-ui/playground';
import { createEditor } from '@semantic-ui/playground/editor';

import { IMPORT_MAP } from './playground-imports.js';

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
  frame.title = 'Live preview';
  $('[data-pg-frame]').replaceWith(frame);

  // the app owns its urls, so any path without a file serves index.html: reloads and deep links land
  // in the app, and its router takes it from there
  const project = new PlaygroundProject({ files: FILES, importMap: IMPORT_MAP, fallback: 'index.html' });
  root.project = project;

  let started = 0;
  project.on('buildStart', () => {
    started = performance.now();
    say('Building…');
  });
  project.on('buildError', (error) => say(`Build error: ${error.message}`, true));
  project.on('buildDone', () => say(`Built in ${Math.round(performance.now() - started)} ms`));

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
  preview.on('error', ({ message }) => say(`Runtime error: ${message}`, true));
  back.addEventListener('click', () => preview.back());
  forward.addEventListener('click', () => preview.forward());
  $('[data-pg-reload]').addEventListener('click', () => preview.reload());

  // the editor: one tab per file, edits rebuild the preview
  const tabs = $('[data-pg-tabs]');
  const editor = createEditor({
    parent: $('[data-pg-editor]'),
    // hidden setup lines don't leave a gap in the numbering
    lineNumbers: 'continuous',
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
