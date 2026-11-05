import { For } from 'solid-js';

// two roots, a heading and a table, so the view is a fragment
export const PrintPage = (props) => (
  <>
    <h3>Print view for {props.params.org}</h3>
    <table class='print'>
      <tbody>
        <For each={props.data.members}>
          {(member) => (
            <tr>
              <td>{member.name}</td>
              <td>{member.role}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </>
);
