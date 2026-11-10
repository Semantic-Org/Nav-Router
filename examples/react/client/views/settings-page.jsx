export const SettingsPage = ({ params }) => (
  <section className='page'>
    <h3>Settings for {params.org}</h3>
    <p>Only an admin sees this. Sign out above and you are sent to sign in.</p>
    <label>
      Team name <input defaultValue={params.org} />
    </label>
  </section>
);
