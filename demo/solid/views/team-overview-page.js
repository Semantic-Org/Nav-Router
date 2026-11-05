import { For } from 'solid-js';
import html from 'solid-js/html';

import { renameMember } from '../store.js';

export const TeamOverviewPage = (props) =>
  html`
  <section class="page">
    <h3>${() => props.params.tab[0].toUpperCase() + props.params.tab.slice(1)}</h3>
    <table class="members">
      <thead><tr><th>Name</th><th>Role</th><th>Access</th></tr></thead>
      <tbody>
        <${For} each=${() => props.data.members}>${(member) =>
    html`
          <tr>
            <td><input value=${member.name} onInput=${(event) =>
      renameMember(member.id, event.target.value)} aria-label=${`Name of ${member.id}`} /></td>
            <td>${member.role}</td>
            <td>${member.access}</td>
          </tr>
        `}<//>
      </tbody>
    </table>
  </section>
`;
