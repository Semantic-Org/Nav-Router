import { renameMember } from '../store.js';

// a rename renders the table again and the diff keeps every row by its key: the row keeps its
// element, the input keeps its focus, and only the name that moved is written
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
        {props.data.members.map((member) => (
          <tr key={member.id}>
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
        ))}
      </tbody>
    </table>
  </section>
);
