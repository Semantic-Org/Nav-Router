export default (props) => (
  <section class='page'>
    <h3>Analytics for {props.data.org}</h3>
    <dl class='stats'>
      <dt>Latency</dt>
      <dd>{props.data.latency}</dd>
      <dt>Uptime</dt>
      <dd>{props.data.uptime}</dd>
    </dl>
  </section>
);
