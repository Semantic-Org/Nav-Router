// a docs page as markdown, for copy page, /<page>.md and the assistants a reader hands it to: the
// title and lede the page header shows, then the source as written
export const markdownFor = (entry) => `# ${entry.data.title}\n\n${entry.data.lede}\n\n${entry.body.trim()}\n`;
