export const SettingsPage = ({ params }) => (
  <section className='page'>
    <h3>Settings for {params.org}</h3>
    <p>Only an admin sees this. Sign out above and it leaves in place.</p>
    <label>
      Team name <input defaultValue={params.org} />
    </label>
  </section>
);
