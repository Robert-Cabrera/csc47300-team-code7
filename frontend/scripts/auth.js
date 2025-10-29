/*
  auth.js
  
  Handles authentication logic including login/logout and user session management.
  Manages persistent authentication state using localStorage.
*/

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isUserLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

export function getUserData() {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

function handleLogout(e) {
  e.preventDefault();

  // Clear localStorage
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userData");

  // Determine if we are on index.html or not
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

  // Redirect to home page
  if (isIndex) {
    window.location.href = "./index.html";
  } else {
    window.location.href = "../index.html";
  }
}

function updateNavbar(loginBtn, userName) {
  loginBtn.innerHTML = `
    <img src="../assets/avatar_placeholder.png" alt="User" class="avatar"> ${userName}
  `;
  loginBtn.classList.remove("login");
  loginBtn.classList.add("account");
  loginBtn.href = "account_settings.html";

  // Add logout button next to Account Settings
  const navRight = document.querySelector('.nav-right');
  if (navRight && !document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<span class="material-symbols-outlined">logout</span>';
    logoutBtn.title = 'Logout';

    logoutBtn.addEventListener('click', handleLogout);

    navRight.appendChild(logoutBtn);
  }
}

// ============================================================================
// BACKEND FUNCTIONS
// ============================================================================

async function tryBackendLogin(data) {
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.identifier, password: data.password })
    });

    if (resp.ok) {
      const body = await resp.json();
      if (body && body.success && body.user) {
        // Persist minimal user data locally (demo only)
        localStorage.setItem('userData', JSON.stringify(body.user));
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
        return { success: true };
      }
      return { success: false, status: resp.status };
    }

    // Explicit 401 or other non-ok status — return status so caller can act
    return { success: false, status: resp.status };
  } catch (err) {
    // Network or server not available — fall through to local/demo check
    console.warn('Backend login failed, falling back to local demo check:', err);
    return { success: false, status: null, error: err };
  }
}

async function tryBackendRegister(data) {
  try {
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username, name:data.name, email: data.email, password: data.password })
    });

    if (resp.status === 201) {
      const body = await resp.json();
      if (body && body.success && body.user) {
        // Persist returned user and log in
        localStorage.setItem('userData', JSON.stringify(body.user));
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
        return { success: true };
      }
      return { success: false, status: resp.status };
    }

    // Conflict (409) or bad request (400)
    return { success: false, status: resp.status };
  } catch (err) {
    console.warn('Backend register failed, falling back to local demo sign-up:', err);
    return { success: false, status: null, error: err };
  }
}

// ============================================================================
// MAIN FUNCTION TO INITIALIZE AUTH LOGIC
// ============================================================================

export function initAuth() {

  // Elements
  const loginBtn = document.getElementById("loginBtn");
  let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  // Determine if we are on index.html or not
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  const isLoginPage = window.location.pathname.includes('login-signup.html');

  // Update UI if logged in
  if (isLoggedIn && loginBtn) {

    const userData = getUserData();
    const userName = userData && userData.name ? userData.name : "User";

    updateNavbar(loginBtn, userName);
  }

  // Redirects to login-signup page if not logged in
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      if (isLoggedIn) {
        return;
      } else {

        // Redirect to login page
        e.preventDefault();
        if (isIndex) {
          window.location.href = "./pages/login-signup.html";
        } else {
          window.location.href = "login-signup.html";
        }
      }
    });
  }

  // Handle login/sign-up
  if (isLoginPage) {
    // === Collapsible panels (not popups) ===
    const signUpBtn = document.getElementById('signUpBtn');
    const loginBtnPage = document.getElementById('loginBtnPage');
    const signupPanel = document.getElementById('signupPanel');
    const loginPanel = document.getElementById('loginPanel');

    function closePanel(panel, btn) {
      if (!panel) return;
      panel.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function openPanel(panel, btn) {
      if (!panel) return;
      // close the other one (single-open behavior)
      if (panel === signupPanel) closePanel(loginPanel, loginBtnPage);
      if (panel === loginPanel) closePanel(signupPanel, signUpBtn);
      panel.classList.add('open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    function togglePanel(panel, btn) {
      if (panel.classList.contains('open')) {
        closePanel(panel, btn);
      } else {
        openPanel(panel, btn);
        // Focus first input for convenience
        const firstInput = panel.querySelector('input');
        if (firstInput) firstInput.focus();
      }
    }

    if (signUpBtn && signupPanel) {
      signUpBtn.addEventListener('click', () => togglePanel(signupPanel, signUpBtn));
    }

    if (loginBtnPage && loginPanel) {
      loginBtnPage.addEventListener('click', () => togglePanel(loginPanel, loginBtnPage));
    }

    // Cancel buttons collapse their panel
    const signupCancel = document.getElementById('signupCancel');
    if (signupCancel) signupCancel.addEventListener('click', () => closePanel(signupPanel, signUpBtn));

    const loginCancel = document.getElementById('loginCancel');
    if (loginCancel) loginCancel.addEventListener('click', () => closePanel(loginPanel, loginBtnPage));


    // === Sign Up: demo persistence (replace with Supabase later) ===
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {

      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!signupForm.reportValidity()) return;
        const data = Object.fromEntries(new FormData(signupForm).entries());

        // ADDED BY ROBERT: Register via backend API
        const result = await tryBackendRegister(data);
        if (result && result.success) {return;}

        // If backend returned 409 -> username/email conflict
        if (result && result.status === 409) {
          alert('Username or email already in use. Please choose another.');
          return;
        }
x
        // If backend unavailable, fall back to demo localStorage behavior
        const localId = `user_local_${Date.now()}`;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify({
          id: localId,
          username: data.username,
          name: data.name,
          email: data.email,
          password: data.password // plaintext for demo; replace with real auth
        }));

        window.location.href = 'dashboard.html';
      });
    }

    // === Login: check credentials (try backend users.json via /api/login, fall back to local demo)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!loginForm.reportValidity()) return;

        const data = Object.fromEntries(new FormData(loginForm).entries());
        const errorEl = document.getElementById('loginError');

        // ADDED BY ROBERT: Try backend login first
        const backendResult = await tryBackendLogin(data);
        if (backendResult && backendResult.success) {return;}

        // If backend explicitly returned 401 -> show invalid credentials and stop
        if (backendResult && backendResult.status === 401) {
          if (errorEl) { errorEl.textContent = 'Invalid credentials.'; errorEl.hidden = false; } return; }

        // Fallback: check demo user stored in localStorage (unchanged behavior)
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
