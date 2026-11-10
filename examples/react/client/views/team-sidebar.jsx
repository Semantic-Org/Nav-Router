import { useLive } from '@nav-router/react';

import { addMember, removed, restoreMember } from '../store.js';

export const TeamSidebar = ({ data, params }) => {
  const hasRemoved = useLive(() => removed.get().length > 0);
  return (
    <div className='side-card'>
      <h4>
        Members <span className='count'>{data.members.length}</span>
      </h4>
      <ul className='list'>
        {data.members.map((member) => (
          <li key={member.id}>
            <a href={`/team/${member.org}/m/${member.id}`} className='item'>
              <span className='dot' data-access={member.access}></span>
              {member.name}
            </a>
          </li>
        ))}
      </ul>
      <div className='side-actions'>
        <button type='button' onClick={() => addMember(params.org)}>Add member</button>
        <button type='button' onClick={restoreMember} disabled={!hasRemoved}>Restore removed</button>
      </div>
      <div className='filler'>
        {Array.from({ length: 30 }, (_, index) => <p key={index} className='muted'>Scroll line {index + 1}</p>)}
      </div>
    </div>
  );
};
