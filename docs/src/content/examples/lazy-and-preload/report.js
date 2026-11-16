// simulate a 300ms chunk download the first time this module is imported
await new Promise((resolve) => setTimeout(resolve, 300));

const ms = Math.round(performance.now());
window.reportLoadedAt = ms;
document.dispatchEvent(new CustomEvent('chunk-ready', { detail: ms }));

export default () => `
  <h1>Quarterly report</h1>
  <p><code>report.js</code> loaded once at <strong>${ms}ms</strong> and stayed cached for every visit after.</p>`;
