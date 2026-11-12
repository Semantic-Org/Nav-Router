import { renameMember } from '../store.js';

// the rows are keyed, so a rename renders the one name again: the row keeps its element and its input
export const TeamOverviewPage = ({ data, params }) => (
  <section class='page'>
    <h3>{params.tab[0].toUpperCase() + params.tab.slice(1)}</h3>
    <table class='members'>
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>
        {data.members.map((member) => (
          <tr key={member.id}>
            <td>
              <input
                value={member.name}
                onChange={(event) => renameMember(member.id, event.target.value)}
                aria-label={`Name of ${member.id}`}
              />
            </td>
            <td>{member.role}</td>
            <td>{member.access}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
