import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';

// the app's own state as solid signals: the routes' data() and guards read them, so a change
// reaches the page through the router's reactive seams rather than through a reload
export const orgs = {
  acme: { name: 'Acme Corporation', region: 'us-east' },
  globex: { name: 'Globex', region: 'eu-west' },
};

const seed = [
  { id: 'ada', org: 'acme', name: 'Ada Lovelace', role: 'Engineer', access: 'admin' },
  { id: 'grace', org: 'acme', name: 'Grace Hopper', role: 'Compiler Lead', access: 'member' },
  { id: 'linus', org: 'acme', name: 'Linus Torvalds', role: 'Kernel', access: 'member' },
  { id: 'margaret', org: 'globex', name: 'Margaret Hamilton', role: 'Flight Software', access: 'admin' },
  { id: 'ken', org: 'globex', name: 'Ken Thompson', role: 'Unix', access: 'member' },
];

const people = {
  member: { id: 'bob', name: 'Bob Chen', role: 'member' },
  admin: { id: 'alice', name: 'Alice Rivera', role: 'admin' },
};

export const [user, setUser] = createSignal(null);
// the members are a store, so a rename moves one name in place: the row showing it keeps its element
// and its input keeps the focus, and only what reads that name is told
const [team, setTeam] = createStore({ members: seed });
export const members = () => team.members;
export const [removed, setRemoved] = createSignal([]);

export const signIn = (role) => setUser(role ? { ...people[role] } : null);

export const renameMember = (id, name) => setTeam('members', (member) => member.id === id, 'name', name);

export const removeMember = (id) => {
  const gone = members().find((member) => member.id === id);
  if (gone) {
    setRemoved((list) => [{ ...gone }, ...list]);
    setTeam('members', (list) => list.filter((member) => member.id !== id));
  }
};

export const restoreMember = () => {
  const [back, ...rest] = removed();
  if (back) {
    setRemoved(rest);
    setTeam('members', (list) => [...list, back]);
  }
};

export const addMember = (org) => {
  const count = members().length + 1;
  setTeam(
    'members',
    (list) => [...list, { id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' }],
  );
};

// the page as the router last announced it, for the chrome
export const [page, setPage] = createSignal(null);

export const isHere = (pathname, { under = false } = {}) => {
  const current = page();
  if (!current?.url) {
    return false;
  }
  const here = new URL(current.url, location.origin).pathname;
  return here === pathname || (under && pathname !== '/' && here.startsWith(`${pathname}/`));
};
