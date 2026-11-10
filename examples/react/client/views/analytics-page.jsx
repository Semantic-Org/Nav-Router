export default ({ data }) => (
  <section className='page'>
    <h3>Analytics for {data.org}</h3>
    <dl className='stats'>
      <dt>Latency</dt>
      <dd>{data.latency}</dd>
      <dt>Uptime</dt>
      <dd>{data.uptime}</dd>
    </dl>
  </section>
);
