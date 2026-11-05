import { For } from 'solid-js';

import { renameMember } from '../store.js';

// the members live in a store, so a rename moves one name in place: the row keeps its element,
// the input keeps its focus, and only the reads of that name are told
export const TeamOverviewPage = (props) => (
  <section class='page'>
    <h3>{props.params.tab[0].toUpperCase() + props.params.tab.slice(1)}</h3>
    <table class='members'>
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.data.members}>
          {(member) => (
            <tr>
              <td>
                <input
                  value={member.name}
                  onInput={(event) => renameMember(member.id, event.target.value)}
                  aria-label={`Name of ${member.id}`}
                />
              </td>
              <td>{member.role}</td>
              <td>{member.access}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </section>
);
