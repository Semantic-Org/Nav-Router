import { href } from 'nav-router';

class TeamShell extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) { return; }
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        header { display: flex; gap: 14px; align-items: baseline; margin-bottom: 18px; }
        a { color: #79c0ff; }
        .role { margin-left: auto; color: #7c7c84; font-size: 13px; }
      </style>
      <header>
        <a href="${href('home')}">Team</a>
        <a href="${href('member', { userId: 'ada' })}">Ada</a>
        <a href="${href('member', { userId: 'mo' })}">Mo</a>
        <span class="role"><slot name="role">2 members</slot></span>
      </header>
      <slot></slot>`;
  }
}

class MemberCard extends HTMLElement {
  set member({ name, role, handle }) {
    this.innerHTML = `<h1>${name}</h1><p>${role} · <code>@${handle}</code></p>`;
  }
}

customElements.define('team-shell', TeamShell);
customElements.define('member-card', MemberCard);
