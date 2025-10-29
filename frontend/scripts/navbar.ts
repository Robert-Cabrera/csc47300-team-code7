/*
  navbar.ts
  
  Handles navigation bar initialization and link setup.
*/

import { isUserLoggedIn } from './auth.js'; // keep .js if needed by build

export function initNavbar(): void {
  // 👇 Add <HTMLAnchorElement> to make TypeScript infer the correct type
  const homeLink = document.querySelector<HTMLAnchorElement>(".nav-left a");

  if (homeLink && isUserLoggedIn()) {
    const isIndex =
      window.location.pathname.endsWith('index.html') ||
      window.location.pathname === '/';

    if (isIndex) {
      homeLink.href = "./pages/dashboard.html";
    } else {
      homeLink.href = "./dashboard.html";
    }
  }
}
