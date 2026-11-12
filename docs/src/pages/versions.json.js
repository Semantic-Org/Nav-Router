// the versions, for every site's menu: a frozen vN site reads this from the latest docs to learn of
// the majors that shipped after it
import { versions } from '../lib/versions.js';

export function GET() {
  return new Response(`${JSON.stringify(versions(), null, 2)}\n`, { headers: { 'content-type': 'application/json' } });
}
