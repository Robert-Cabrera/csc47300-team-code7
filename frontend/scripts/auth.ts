/*
  auth.ts
  Handles authentication logic including login/logout and user session management.
  Manages persistent authentication state using localStorage.
*/

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isUserLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

export function getUserData(): Record<string, any> | null {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

function handleLogout(e: Event): void {
  e.preventDefault();
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userData");
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  if (isIndex) {
    window.location.href = "./index.html";
  } else {
    window.location.href = "../index.html";
  }
}

function updateNavbar(loginBtn: HTMLElement, userName: string): void {
    loginBtn.innerHTML = `
        <img src="../assets/avatar_placeholder.png" alt="User" class="avatar"> ${userName}
    `;
    loginBtn.classList.remove("login");
    loginBtn.classList.add("account");
    (loginBtn as HTMLAnchorElement).href = "account_settings.html";
    const navRight = document.querySelector('.nav-right');
    if (navRight && !document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = '<span class="material-symbols-outlined">logout</span>';
        logoutBtn.title = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);
        // Insert before theme toggle button
        const themeToggleBtn = navRight?.querySelector('#theme-toggle');
        if (themeToggleBtn) {
            navRight.insertBefore(logoutBtn, themeToggleBtn);
        } else {
            navRight.appendChild(logoutBtn);
        }
    }
}

// ============================================================================
// BACKEND FUNCTIONS
// ============================================================================

async function tryBackendLogin(data: { identifier: string; password: string }): Promise<{ success: boolean; status?: number; error?: any; user?: any }> {
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.identifier, password: data.password })
    });
    if (resp.ok) {
      const body = await resp.json();
      if (body && body.success && body.user) {
        localStorage.setItem('userData', JSON.stringify(body.user));
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
        return { success: true };
      }
      return { success: false, status: resp.status };
    }
    return { success: false, status: resp.status };
  } catch (err) {
    console.warn('Backend login failed, falling back to local demo check:', err);
    return { success: false, status: null, error: err };
  }
}

async function tryBackendRegister(data: { username: string; name: string; email: string; password: string }): Promise<{ success: boolean; status?: number; error?: any; user?: any }> {
  try {
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username, name:data.name, email: data.email, password: data.password })
    });
    if (resp.status === 201) {
      const body = await resp.json();
      if (body && body.success && body.user) {
        localStorage.setItem('userData', JSON.stringify(body.user));
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
        return { success: true };
      }
      return { success: false, status: resp.status };
    }
    return { success: false, status: resp.status };
  } catch (err) {
    console.warn('Backend register failed, falling back to local demo sign-up:', err);
    return { success: false, status: null, error: err };
  }
}

// ============================================================================
// MAIN FUNCTION TO INITIALIZE AUTH LOGIC
// ============================================================================

export function initAuth(): void {
  const loginBtn = document.getElementById("loginBtn");
  let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  const isLoginPage = window.location.pathname.includes('login-signup.html');
  if (isLoggedIn && loginBtn) {
    const userData = getUserData();
    const userName = userData && userData.name ? userData.name : "User";
    updateNavbar(loginBtn, userName);
  }
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      if (isLoggedIn) {
        return;
      } else {
        e.preventDefault();
        if (isIndex) {
          window.location.href = "./pages/login-signup.html";
        } else {
          window.location.href = "login-signup.html";
        }
      }
    });
  }
  if (isLoginPage) {
    const signUpBtn = document.getElementById('signUpBtn');
    const loginBtnPage = document.getElementById('loginBtnPage');
    const signupPanel = document.getElementById('signupPanel');
    const loginPanel = document.getElementById('loginPanel');
    function closePanel(panel: HTMLElement | null, btn: HTMLElement | null): void {
      if (!panel) return;
      panel.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function openPanel(panel: HTMLElement | null, btn: HTMLElement | null): void {
      if (!panel) return;
      if (panel === signupPanel) closePanel(loginPanel, loginBtnPage);
      if (panel === loginPanel) closePanel(signupPanel, signUpBtn);
      panel.classList.add('open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
    function togglePanel(panel: HTMLElement, btn: HTMLElement): void {
      if (panel.classList.contains('open')) {
        closePanel(panel, btn);
      } else {
        openPanel(panel, btn);
        const firstInput = panel.querySelector('input');
        if (firstInput) (firstInput as HTMLElement).focus();
      }
    }
    if (signUpBtn && signupPanel) {
      signUpBtn.addEventListener('click', () => togglePanel(signupPanel, signUpBtn));
    }
    if (loginBtnPage && loginPanel) {
      loginBtnPage.addEventListener('click', () => togglePanel(loginPanel, loginBtnPage));
    }
    const signupCancel = document.getElementById('signupCancel');
    if (signupCancel) signupCancel.addEventListener('click', () => closePanel(signupPanel, signUpBtn));
    const loginCancel = document.getElementById('loginCancel');
    if (loginCancel) loginCancel.addEventListener('click', () => closePanel(loginPanel, loginBtnPage));
    const signupForm = document.getElementById('signupForm') as HTMLFormElement | null;
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!signupForm.reportValidity()) return;
        const data = Object.fromEntries(new FormData(signupForm).entries()) as { username: string; name: string; email: string; password: string };
        const result = await tryBackendRegister(data);
        if (result && result.success) {return;}
        if (result && result.status === 409) {
          alert('Username or email already in use. Please choose another.');
          return;
        }
        const localId = `user_local_${Date.now()}`;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify({
          id: localId,
          username: data.username,
          name: data.name,
          email: data.email,
          password: data.password
        }));
        window.location.href = 'dashboard.html';
      });
    }
    const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!loginForm.reportValidity()) return;
        const data = Object.fromEntries(new FormData(loginForm).entries()) as { identifier: string; password: string };
        const errorEl = document.getElementById('loginError');
        const backendResult = await tryBackendLogin(data);
        if (backendResult && backendResult.success) {return;}
        if (backendResult && backendResult.status === 401) {
          if (errorEl) { errorEl.textContent = 'Invalid credentials.'; errorEl.hidden = false; } return; }
        const user = getUserData();
        if (!user) {
          if (errorEl) { errorEl.textContent = 'No account found. Please sign up first.'; errorEl.hidden = false; }
          return;
        }
        const idMatch = [user.id, user.username, user.email].includes(data.identifier);
        const pwMatch = data.password === user.password;
        if (idMatch && pwMatch) {
          localStorage.setItem('isLoggedIn', 'true');
          window.location.href = 'dashboard.html';
        } else {
          if (errorEl) { errorEl.textContent = 'Invalid credentials. Check your username/email and password.'; errorEl.hidden = false; }
        }
      });
    }
  }
}
