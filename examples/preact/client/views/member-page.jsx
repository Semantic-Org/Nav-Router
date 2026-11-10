import { removeMember, renameMember } from '../store.js';

const Profile = ({ data, params }) => (
  <article class='page member'>
    <h3>{data.member.name}</h3>
    <p class='muted'>{data.member.role} · {data.member.org}</p>
    <label>
      Name <input value={data.member.name} onChange={(event) => renameMember(params.id, event.target.value)} />
    </label>
    <nav class='sub'>
      <a href={`/team/${params.org}/m/${params.id}`}>Profile</a>
      <a href={`/team/${params.org}/m/${params.id}?section=activity`}>Activity</a>
    </nav>
    <button type='button' class='danger' onClick={() => removeMember(params.id)}>
      Remove {data.member.name}
    </button>
  </article>
);

const Activity = ({ data, params }) => (
  <ul class='page activity'>
    <li>{data.member.name} pushed three commits</li>
    <li>Reviewed two pull requests</li>
    <li>
      <a href={`/team/${params.org}/m/${params.id}`}>Back to profile</a>
    </li>
  </ul>
);

// the view's root changes with the query: an article for the profile, a list for the activity
export const MemberPage = (
  props,
) => (props.query.section === 'activity' ? <Activity {...props} /> : <Profile {...props} />);
