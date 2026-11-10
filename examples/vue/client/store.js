import { reactive, ref, shallowRef } from 'vue';

// the app's own state as vue refs: the routes' data() and guards read them, so a change reaches
// the page through the router's reactive seams rather than through a reload
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

export const user = ref(null);
// the members are reactive, so a rename moves one name in place: the routes' data() never read it
// and do not run again, the row showing it keeps its element and its input keeps the focus
const team = reactive({ members: seed });
export const members = () => team.members;
export const removed = shallowRef([]);

export const signIn = (role) => {
  user.value = role ? { ...people[role] } : null;
};

export const renameMember = (id, name) => {
  team.members.find((member) => member.id === id).name = name;
};

export const removeMember = (id) => {
  const gone = team.members.find((member) => member.id === id);
  if (gone) {
    removed.value = [{ ...gone }, ...removed.value];
    team.members = team.members.filter((member) => member.id !== id);
  }
};

export const restoreMember = () => {
  const [back, ...rest] = removed.value;
  if (back) {
    removed.value = rest;
    team.members.push(back);
  }
};

export const addMember = (org) => {
  const count = team.members.length + 1;
  team.members.push({ id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' });
};
