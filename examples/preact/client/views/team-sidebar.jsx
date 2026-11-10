import { addMember, restoreMember } from '../store.js';

export const TeamSidebar = ({ data, params }) => (
  <div class='side-card'>
    <h4>
      Members <span class='count'>{data.members.length}</span>
    </h4>
    <ul class='list'>
      {data.members.map((member) => (
        <li key={member.id}>
          <a href={`/team/${member.org}/m/${member.id}`} class='item'>
            <span class='dot' data-access={member.access}></span>
            {member.name}
          </a>
        </li>
      ))}
    </ul>
    <div class='side-actions'>
      <button type='button' onClick={() => addMember(params.org)}>Add member</button>
      <button type='button' onClick={restoreMember} disabled={data.removedCount === 0}>Restore removed</button>
    </div>
    <div class='filler'>
      {Array.from({ length: 30 }, (_, index) => <p class='muted'>Scroll line {index + 1}</p>)}
    </div>
  </div>
);
