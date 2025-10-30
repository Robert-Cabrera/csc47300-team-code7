/*
  theme.ts

  Handles theme toggling and logo updates for all logo elements.
*/

export function initTheme(): void {
  const toggleButton = document.getElementById('theme-toggle');
  const body = document.body;
  const currentTheme = localStorage.getItem('theme');

  const isIndex = window.location.pathname.endsWith('index.html');

  if (!toggleButton) return;

  // --- Update all matching logos, not just the first ---
  function updateLogo(theme: string): void {
    const logoElements = document.querySelectorAll('.logo') as NodeListOf<HTMLImageElement>;
    if (logoElements.length) {
      const basePath = isIndex ? './assets/' : '../assets/';
      const newSrc = theme === 'dark-theme'
        ? `${basePath}NoteSmith_logo_dark.png`
        : `${basePath}NoteSmith_logo.png`;
      logoElements.forEach((logo) => {
        logo.src = newSrc;
      });
    }

    // Update hero video source
    const heroVideo = document.querySelector('.hero-video') as HTMLVideoElement | null;
    if (heroVideo) {
      const source = heroVideo.querySelector('source');
      if (source) {
        const videoSrc = theme === 'dark-theme'
          ? (isIndex ? './assets/note_smith_animated_logo_dark.mp4' : '../assets/note_smith_animated_logo_dark.mp4')
          : (isIndex ? './assets/note_smith_animated_logo_light.mp4' : '../assets/note_smith_animated_logo_light.mp4');
        source.setAttribute('src', videoSrc);
        heroVideo.load();
      }
    }
  }

  function updateButtonIcon(theme: string): void {
    if (theme === 'dark-theme') {
      toggleButton.setAttribute('aria-label', 'Switch to light theme');
      toggleButton.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';
    } else {
      toggleButton.setAttribute('aria-label', 'Switch to dark theme');
      toggleButton.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
    }
  }

  // --- Apply current or preferred theme ---
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

  // --- Theme toggle handler ---
  toggleButton.addEventListener('click', () => {
    const isDark = body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';

    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    updateButtonIcon(newTheme);
    updateLogo(newTheme);
  });
}
