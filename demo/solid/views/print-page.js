import { For } from 'solid-js';
import html from 'solid-js/html';

// two roots, a heading and a table, so the view is a fragment
export const PrintPage = (props) => [
  html`<h3>Print view for ${() => props.params.org}</h3>`,
  html`<table class="print"><tbody><${For} each=${() => props.data.members}>${(member) =>
    html`<tr><td>${() => member.name}</td><td>${() => member.role}</td></tr>`}<//></tbody></table>`,
];
