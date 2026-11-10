import { useLive } from '@nav-router/react';

import { members, renameMember } from '../store.js';

// a controlled input needs its value back in the tick of the keystroke or the caret jumps to the
// end, and a route's data lands a microtask after the write, so the input reads the name from the
// store, which moves at once. what shows the name elsewhere reads the route's data
export const NameInput = ({ id, ...rest }) => {
  const name = useLive(() => members().find((member) => member.id === id)?.name ?? '');
  return <input value={name} onChange={(event) => renameMember(id, event.target.value)} {...rest} />;
};
