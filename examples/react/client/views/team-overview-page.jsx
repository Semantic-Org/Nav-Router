import { update } from '@nav-router/react';

// the filter lives in the url, and the page is told of each new query in place, so the input keeps
// its element and the focus. the input holds what is typed, since the url follows a navigation
// later, and its key starts it again on another tab
export const TeamOverviewPage = ({ data, params, query }) => {
  const shown = data.members.filter((member) => member.name.toLowerCase().includes(query.filter.toLowerCase()));
  return (
    <section className='page'>
      <h3>{params.tab[0].toUpperCase() + params.tab.slice(1)}</h3>
      <label>
        Filter{' '}
        <input
          key={params.tab}
          defaultValue={query.filter}
          onChange={(event) => update({ filter: event.target.value })}
        />
      </label>
      <table className='members'>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((member) => (
            <tr key={member.id}>
              <td>
                <a href={`/team/${member.org}/m/${member.id}`}>{member.name}</a>
              </td>
              <td>{member.role}</td>
              <td>{member.access}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
