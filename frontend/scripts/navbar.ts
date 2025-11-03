/* 
  ? File: 
      navbar.ts

  ? Main Contributors: 
      David
  
  ? Functionalities:
    - Initialize and manage navigation bar behavior based on user authentication status
*/

// Note that this import is post-build, that's why we use .js extension
import { isUserLoggedIn } from './auth.js';

export function initNavbar(): void {

  // Adjust home link based on authentication status  
  const homeLink = document.querySelector<HTMLAnchorElement>(".nav-left a");

  // If user is logged in, point home link to dashboard
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
