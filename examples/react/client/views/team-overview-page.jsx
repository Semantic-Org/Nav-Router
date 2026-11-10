import { NameInput } from './name-input.jsx';

// a rename renders the page again with a new list, and the rows are keyed by member, so the row
// keeps its element and its input the focus
export const TeamOverviewPage = ({ data, params }) => (
  <section className='page'>
    <h3>{params.tab[0].toUpperCase() + params.tab.slice(1)}</h3>
    <table className='members'>
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
              <NameInput id={member.id} aria-label={`Name of ${member.id}`} />
            </td>
            <td>{member.role}</td>
            <td>{member.access}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
