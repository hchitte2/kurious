/**
 * Navigation config. Routes come from generouted (src/pages/); the Kurious top
 * bar (src/components/kurious/TopBar.tsx) shows the Wonder Wall link and the
 * grown-up menu (My questions, About, sign in/out).
 */

export interface NavItem {
  path: string
  label: string
}

export const nav: NavItem[] = [
  { path: '/wall', label: 'Wonder Wall' },
  { path: '/me', label: 'My questions' },
  { path: '/about', label: 'About Kurious' },
]
