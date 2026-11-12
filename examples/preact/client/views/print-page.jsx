// two roots, a heading and a table, so the view is a fragment
export const PrintPage = ({ data, params }) => (
  <>
    <h3>Print view for {params.org}</h3>
    <table class='print'>
      <tbody>
        {data.members.map((member) => (
          <tr key={member.id}>
            <td>{member.name}</td>
            <td>{member.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);
