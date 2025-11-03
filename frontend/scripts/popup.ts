/*
  popup.ts - Popup system with built-in messages
*/

export function initPopup(): void {
  const links = document.querySelectorAll('.info-link');

  // change these how ever you like
  const popupMessages: Record<string, string> = {
    "Terms of Use": `
      <h3>Terms of Use</h3>
      <p>Opening our site implies acceptance of these terms and conditions. </p>
      1. We are not legally responsible for any user-generated content unless it is groundbreaking. </p>
      2. Privacy is a privilege, not a right. Signup for premium to gain the privilege.</p>
      3. We reserve the right to modify these terms at any time.</p>
    `,
    "Privacy Policy": `
      <h3>Privacy Policy</h3>
      <p>Your Data? No no no... OUR Data.</p>

    `,
    "Accessibility": `
      <h3>Accessibility</h3>
      <p>ᓚᘏᗢ ヾ(⌐■_■)ノ♪ ᓚᘏᗢ</p>
    `
  };

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const label = (link as HTMLElement).textContent?.trim() || '';
      const message = popupMessages[label] || `
        <h3>Information</h3>
        <p>Content for <strong>${label}</strong> is not available yet.</p>
      `;

      showPopup(message);
    });
  });
}

function showPopup(html: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';

  const popup = document.createElement('div');
  popup.className = 'popup-container';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'popup-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close popup');
  closeBtn.addEventListener('click', () => removePopup(overlay));

  const contentBox = document.createElement('div');
  contentBox.className = 'popup-content-box';
  contentBox.innerHTML = html;

  popup.appendChild(closeBtn);
  popup.appendChild(contentBox);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Close on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removePopup(overlay);
  });

  // Close on Escape
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      removePopup(overlay);
      document.removeEventListener('keydown', escHandler);
    }
  });
}

function removePopup(overlay: HTMLElement): void {
  overlay.classList.add('popup-fade-out');
  setTimeout(() => overlay.remove(), 200);
}
