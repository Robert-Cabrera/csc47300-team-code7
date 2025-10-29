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
    const userName = userData && userData.username ? userData.username : "User";

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

  /* Behavior for now:
      * Auto logs in as test user Alice (user_001) on login button click
      * Redirects to dashboard on success
  */

  if (isLoginPage) {
    // === Collapsible panels (not popups) ===
const signUpBtn = document.getElementById('signUpBtn');
const loginBtnPage = document.getElementById('loginBtnPage');
const signupPanel = document.getElementById('signupPanel');
const loginPanel  = document.getElementById('loginPanel');

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
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!signupForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(signupForm).entries());

    // DEMO ONLY: store user locally so Login can verify
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userData", JSON.stringify({
      id: data.id,
      username: data.username,
      email: data.email,
      password: data.password   // plaintext for demo; replace with real auth
    }));
    window.location.href = "dashboard.html";
  });
}

// === Login: check demo credentials ===

// === Login via users.json (fallback to localStorage for newly signed-up demo users) ===
const loginForm = document.getElementById('loginForm');
//const loginCancel = document.getElementById('loginCancel');
const loginErrorEl = document.getElementById('loginError');

loginCancel?.addEventListener('click', () => closePanel(loginPanel, loginBtnPage));

// cache to avoid re-fetch
let USERS_JSON_CACHE = null;

// Try a couple of likely paths so it works from /pages/login-signup.html
async function loadUsersJSON() {
  if (USERS_JSON_CACHE) return USERS_JSON_CACHE;

  const candidates = [
    '/data/users.json',     // absolute from site root (preferred)
    '../data/users.json',   // relative from /pages/login-signup.html
    '../../data/users.json' // fallback just in case of deeper nesting
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        // Expecting shape: { users: [ ... ] }
        const list = Array.isArray(json?.users) ? json.users : [];
        USERS_JSON_CACHE = list;
        return USERS_JSON_CACHE;
      }
    } catch {
      // try next candidate
    }
  }

  USERS_JSON_CACHE = [];
  return USERS_JSON_CACHE;
}

// Find by id OR username OR email (case-insensitive)
function findUser(list, identifier) {
  const needle = String(identifier ?? '').trim().toLowerCase();
  return list.find(u => {
    const byId   = String(u.id ?? '').toLowerCase() === needle;
    const byUser = String(u.username ?? '').toLowerCase() === needle;
    const byMail = String(u.email ?? '').toLowerCase() === needle;
    return byId || byUser || byMail;
  }) || null;
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!loginForm.reportValidity()) return;

  loginErrorEl && (loginErrorEl.hidden = true, loginErrorEl.textContent = '');

  const form = new FormData(loginForm);
  const identifier = form.get('identifier'); // username OR email OR id
  const password   = form.get('password');

  // 1) Try users.json first (e.g., Alice from your JSON)
  const users = await loadUsersJSON();
  const hit   = findUser(users, identifier);

  if (hit && String(hit.password) === String(password)) {
    // success from users.json
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userData", JSON.stringify({
      id: hit.id,
      username: hit.username,
      email: hit.email,
      profilePicture: hit.profilePicture ?? ""
    }));
    window.location.href = "dashboard.html";
    return;
  }

  // 2) Fallback: allow locally signed-up demo user (your current Sign Up flow)
  const localUserRaw = localStorage.getItem("userData");
  if (localUserRaw) {
    try {
      const localUser = JSON.parse(localUserRaw);
      const idMatch = [
        localUser.id, localUser.username, localUser.email
      ].map(v => String(v ?? '').toLowerCase())
       .includes(String(identifier ?? '').toLowerCase());
      const pwMatch = String(password) === String(localUser.password);

      if (idMatch && pwMatch) {
        localStorage.setItem("isLoggedIn", "true");
        window.location.href = "dashboard.html";
        return;
      }
    } catch {
      // ignore parse errors
    }
  }

  // 3) If neither matched, show error
  if (loginErrorEl) {
    loginErrorEl.textContent = "Invalid credentials. Check your username/email and password.";
    loginErrorEl.hidden = false;
  }
});


  }
}
