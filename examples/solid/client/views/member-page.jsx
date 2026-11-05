import { Show } from 'solid-js';

import { removeMember, renameMember } from '../store.js';

const Profile = (props) => (
  <article class='page member'>
    <h3>{props.data.member.name}</h3>
    <p class='muted'>{props.data.member.role} · {props.data.member.org}</p>
    <label>
      Name{' '}
      <input value={props.data.member.name} onInput={(event) => renameMember(props.params.id, event.target.value)} />
    </label>
    <nav class='sub'>
      <a href={`/team/${props.params.org}/m/${props.params.id}`}>Profile</a>
      <a href={`/team/${props.params.org}/m/${props.params.id}?section=activity`}>Activity</a>
    </nav>
    <button type='button' class='danger' onClick={() => removeMember(props.params.id)}>
      Remove {props.data.member.name}
    </button>
  </article>
);

const Activity = (props) => (
  <ul class='page activity'>
    <li>{props.data.member.name} pushed three commits</li>
    <li>Reviewed two pull requests</li>
    <li>
      <a href={`/team/${props.params.org}/m/${props.params.id}`}>Back to profile</a>
    </li>
  </ul>
);

// the view's root changes with the query: an article for the profile, a list for the activity
export const MemberPage = (props) => (
  <Show when={props.query.section === 'activity'} fallback={<Profile {...props} />}>
    <Activity {...props} />
  </Show>
);
