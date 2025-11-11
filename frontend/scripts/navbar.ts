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

  // Helper to run navbar adjustments once DOM is available
  const runNow = () => {
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

    // Hide nav-center buttons if user is not logged in
    if (!isUserLoggedIn()) {
      const crashCourseBtn = document.getElementById('crashCourseBtn');
      const practiceTestBtn = document.getElementById('practiceTestBtn');
      const summaryBtn = document.getElementById('summaryBtn');
      if (crashCourseBtn) crashCourseBtn.style.display = 'none';
      if (practiceTestBtn) practiceTestBtn.style.display = 'none';
      if (summaryBtn) summaryBtn.style.display = 'none';
    }
  };

  // If DOM is still loading, wait; otherwise run immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runNow);
  } else {
    runNow();
  }
}
