import { removeMember } from '../store.js';
import { NameInput } from './name-input.jsx';

const Profile = ({ data, params }) => (
  <article className='page member'>
    <h3>{data.member.name}</h3>
    <p className='muted'>{data.member.role} · {data.member.org}</p>
    <label>
      Name <NameInput id={params.id} />
    </label>
    <nav className='sub'>
      <a href={`/team/${params.org}/m/${params.id}`}>Profile</a>
      <a href={`/team/${params.org}/m/${params.id}?section=activity`}>Activity</a>
    </nav>
    <button type='button' className='danger' onClick={() => removeMember(params.id)}>
      Remove {data.member.name}
    </button>
  </article>
);

const Activity = ({ data, params }) => (
  <ul className='page activity'>
    <li>{data.member.name} pushed three commits</li>
    <li>Reviewed two pull requests</li>
    <li>
      <a href={`/team/${params.org}/m/${params.id}`}>Back to profile</a>
    </li>
  </ul>
);

// the view's root changes with the query: an article for the profile, a list for the activity
export const MemberPage = (props) => {
  const Section = props.query.section === 'activity' ? Activity : Profile;
  return <Section {...props} />;
};
