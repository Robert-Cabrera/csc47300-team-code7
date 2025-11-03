/* 
  ? File: 
      theme.ts

  ? Main Contributors: 
      David
  
  ? Functionalities:
    - Initialize and manage theme toggling (light/dark)
    - Update logos and hero video based on theme
    - Persist user theme preference in localStorage
*/

// ==================== THEME INITIALIZATION =======================
export function initTheme(): void {
  const toggleButton = document.getElementById('theme-toggle');
  const body = document.body;
  const currentTheme = localStorage.getItem('theme');
  const isIndex = window.location.pathname.endsWith('index.html');

  if (!toggleButton) return;

  // ==================== LOGO AND VIDEO UPDATER =======================
  function updateLogo(theme: string): void {
    // Update all logo images to match theme
    const logos = document.querySelectorAll('.logo') as NodeListOf<HTMLImageElement>;
    if (logos.length) {
      const basePath = isIndex ? './assets/' : '../assets/';
      const newSrc = theme === 'dark-theme'
        ? `${basePath}NoteSmith_logo_dark.png`
        : `${basePath}NoteSmith_logo.png`;
      logos.forEach(logo => (logo.src = newSrc));
    }

    // Update hero video (if present) based on theme
    const heroVideo = document.querySelector('.hero-video') as HTMLVideoElement | null;
    if (heroVideo) {
      const source = heroVideo.querySelector('source');
      if (source) {
        const videoSrc = theme === 'dark-theme'
          ? (isIndex
              ? './assets/note_smith_animated_logo_dark.mp4'
              : '../assets/note_smith_animated_logo_dark.mp4')
          : (isIndex
              ? './assets/note_smith_animated_logo_light.mp4'
              : '../assets/note_smith_animated_logo_light.mp4');
        source.setAttribute('src', videoSrc);
        heroVideo.load();
      }
    }
  }

  // ==================== BUTTON ICON UPDATER =======================
  function updateButtonIcon(theme: string): void {
    // Switch icon and ARIA label depending on current theme
    if (theme === 'dark-theme') {
      toggleButton.setAttribute('aria-label', 'Switch to light theme');
      toggleButton.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';
    } else {
      toggleButton.setAttribute('aria-label', 'Switch to dark theme');
      toggleButton.innerHTML = '<span class="material-symbols-outlined">dark_mode</span>';
    }
  }

  // ==================== INITIAL THEME APPLICATION =======================
  if (currentTheme) {
    // Apply saved user preference
    body.classList.add(currentTheme);
    updateButtonIcon(currentTheme);
    updateLogo(currentTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Apply system preference (dark)
    body.classList.add('dark-theme');
    updateButtonIcon('dark-theme');
    updateLogo('dark-theme');
  } else {
    // Default to light theme
    body.classList.add('light-theme');
    updateButtonIcon('light-theme');
    updateLogo('light-theme');
  }

  // ==================== THEME TOGGLE HANDLER =======================
  toggleButton.addEventListener('click', () => {
    // Determine and apply the opposite theme
    const isDark = body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';

    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(newTheme);

    // Persist new preference
    localStorage.setItem('theme', newTheme);

    // Update visuals and assets
    updateButtonIcon(newTheme);
    updateLogo(newTheme);
  });
}
