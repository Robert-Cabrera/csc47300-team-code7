/*
  theme.ts

  TypeScript migration of theme.js. Handles theme toggling and logo updates.
*/

export function initTheme(): void {
  const toggleButton = document.getElementById('theme-toggle');
  const body = document.body;
  const currentTheme = localStorage.getItem('theme');

  const isIndex = window.location.pathname.endsWith('index.html');

  if (!toggleButton) return;

  const logoElement = document.querySelector('.logo') as HTMLImageElement | null;

  function updateButtonIcon(theme: string) {
    if (theme === 'dark-theme') {
      toggleButton.setAttribute('aria-label', 'Switch to light theme');
      toggleButton.textContent = 'Light Mode';
    } else {
      toggleButton.setAttribute('aria-label', 'Switch to dark theme');
      toggleButton.textContent = 'Dark Mode';
    }
  }

  function updateLogo(theme: string) {
    if (!logoElement) return;
    const basePath = isIndex ? './assets/' : '../assets/';
    logoElement.src = theme === 'dark-theme' ? basePath + 'NoteSmith_logo_dark.png' : basePath + 'NoteSmith_logo.png';
  }

  if (currentTheme) {
    body.classList.add(currentTheme);
    updateButtonIcon(currentTheme);
    updateLogo(currentTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    body.classList.add('dark-theme');
    updateButtonIcon('dark-theme');
    updateLogo('dark-theme');
  } else {
    updateButtonIcon('light-theme');
    updateLogo('light-theme');
  }

  toggleButton.addEventListener('click', () => {
    const isDark = body.classList.contains('dark-theme');

    if (isDark) {
      body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light-theme');
      updateButtonIcon('light-theme');
      updateLogo('light-theme');
    } else {
      body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark-theme');
      updateButtonIcon('dark-theme');
      updateLogo('dark-theme');
    }
  });
}
