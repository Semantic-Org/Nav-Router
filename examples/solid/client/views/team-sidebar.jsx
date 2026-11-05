import { For } from 'solid-js';

import { addMember, removed, restoreMember } from '../store.js';

export const TeamSidebar = (props) => (
  <div class='side-card'>
    <h4>
      Members <span class='count'>{props.data.members.length}</span>
    </h4>
    <ul class='list'>
      <For each={props.data.members}>
        {(member) => (
          <li>
            <a href={`/team/${member.org}/m/${member.id}`} class='item'>
              <span class='dot' data-access={member.access}></span>
              {member.name}
            </a>
          </li>
        )}
      </For>
    </ul>
    <div class='side-actions'>
      <button type='button' onClick={() => addMember(props.params.org)}>Add member</button>
      <button type='button' onClick={restoreMember} disabled={removed().length === 0}>Restore removed</button>
    </div>
    <div class='filler'>
      {Array.from({ length: 30 }, (_, index) => <p class='muted'>Scroll line {index + 1}</p>)}
    </div>
  </div>
);
