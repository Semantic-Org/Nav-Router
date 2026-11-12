import { href } from 'nav-router';

// the frame every page shares: links built from route names, and a slot for the page
export const Layout = () => `
  <header>
    <a href="${href('home')}">Team</a>
    <a href="${href('member', { userId: 'ada' })}">Ada</a>
    <a href="${href('member', { userId: 'mo' })}">Mo</a>
  </header>
  <slot></slot>`;
