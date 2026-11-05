import html from 'solid-js/html';

export const SettingsPage = (props) =>
  html`
  <section class="page">
    <h3>Settings for ${() => props.params.org}</h3>
    <p>Only an admin sees this. Sign out above and it leaves in place.</p>
    <label>Team name <input value=${() => props.params.org} /></label>
  </section>
`;
