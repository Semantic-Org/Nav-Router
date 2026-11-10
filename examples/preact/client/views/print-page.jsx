// two roots, a heading and a table, so the view is a fragment
export const PrintPage = (props) => (
  <>
    <h3>Print view for {props.params.org}</h3>
    <table class='print'>
      <tbody>
        {props.data.members.map((member) => (
          <tr key={member.id}>
            <td>{member.name}</td>
            <td>{member.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);
