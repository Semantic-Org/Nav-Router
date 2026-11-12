// the interface's words in the page's language, as the page's layout wrote them (lib/i18n.js): a key
// and its values in, the text out. a key the page didn't carry comes back as the key
let strings;
const all = () =>
  strings ??= (() => {
    try {
      return JSON.parse(document.getElementById('ui-strings')?.textContent ?? '{}');
    }
    catch {
      return {};
    }
  })();

export function ui(key, vars = {}) {
  return (all()[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// words that change with a count: key.one, key.other and whichever of zero, two, few and many the
// page's language tells apart (arabic all six, japanese only other). the language's own rules pick
// the form, and a form it hasn't written reads as key.other
export function plural(key, count, vars = {}) {
  const form = new Intl.PluralRules(document.documentElement.lang).select(count);
  return ui(`${key}.${form}` in all() ? `${key}.${form}` : `${key}.other`, vars);
}
