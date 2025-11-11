/* 
  ? File: 
      auth.ts

  ? Main Contributors: 
      Tyler
  
  ? Functionalities:
  - Check if user is logged in
  - Retrieve user data from localStorage
  - Handle user logout
  - Update navbar to show user info when logged in (avatar and name)
  - Attempt to log in via backend API with fallback to local demo check
  - Attempt to register via backend API with fallback to local demo sign-up
  - Initialize auth logic: set up event listeners and manage auth state
*/


// ============================ HELPER FUNCTIONS ===============================

// Check if user is logged in
export function isUserLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

// Retrieve user data from localStorage
export function getUserData(): Record<string, any> | null {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

// Handle user logout
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

// Update navbar to show user info when logged in (avatar and name)
function updateNavbar(loginBtn: HTMLElement, userName: string): void {
    
    // HTML structure for user avatar and name
    loginBtn.innerHTML = `
        <img src="../assets/avatar_placeholder.png" alt="User" class="avatar"> ${userName}
    `;
    loginBtn.classList.remove("login");
    loginBtn.classList.add("account");
    
    // Change link to account settings page (handle both index and pages context)
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    (loginBtn as HTMLAnchorElement).href = isIndex ? "./pages/account_settings.html" : "account_settings.html";
    
    const navRight = document.querySelector('.nav-right');
    
    // Add logout button if not already present
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

// ============================ BACKEND FUNCTIONS ===============================

// Attempt to log in via backend API
async function tryBackendLogin(data: { identifier: string; password: string }): Promise<{ success: boolean; status?: number; error?: any; user?: any }> {
  try {
    
    // Send login request to backend
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.identifier, password: data.password })
    });
    
    // Check for successful response (if sotore user data and redirect)
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
  
  // Fallback on error
  } catch (err) {
    console.warn('Backend login failed, falling back to local demo check:', err);
    return { success: false, status: null, error: err };
  }
}

// Attempt to register via backend API
async function tryBackendRegister(data: { username: string; name: string; email: string; password: string }): Promise<{ success: boolean; status?: number; error?: any; user?: any }> {
  try {
    
    // Send registration request to backend
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username, name:data.name, email: data.email, password: data.password })
    });

    // Check for successful response (if so, store user data and redirect)
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

  // Fallback on error
  } catch (err) {
    console.warn('Backend register failed, falling back to local demo sign-up:', err);
    return { success: false, status: null, error: err };
  }
}

// =================== MAIN FUNCTION TO INITIALIZE AUTH LOGIC ====================

// Init function: sets up event listeners and manages auth state
export function initAuth(): void {
  
  // Constant references and state checks 
  const loginBtn = document.getElementById("loginBtn");
  let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  const isLoginPage = window.location.pathname.includes('login-signup.html');
  
  // If logged in, update navbar with user info
  if (isLoggedIn && loginBtn) {
    const userData = getUserData();
    const userName = userData && userData.name ? userData.name : "User";
    updateNavbar(loginBtn, userName);
  }
  
  // Login button click handler
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

  // If on login/signup page, set up form handlers
  if (isLoginPage) {

    // Panel toggle logic
    const signUpBtn = document.getElementById('signUpBtn');
    const loginBtnPage = document.getElementById('loginBtnPage');
    const signupPanel = document.getElementById('signupPanel');
    const loginPanel = document.getElementById('loginPanel');

    // Functions to open/close/toggle panels
    function closePanel(panel: HTMLElement | null, btn: HTMLElement | null): void {
      if (!panel) return;
      panel.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    // Open a panel and close the other
    function openPanel(panel: HTMLElement | null, btn: HTMLElement | null): void {
      if (!panel) return;
      if (panel === signupPanel) closePanel(loginPanel, loginBtnPage);
      if (panel === loginPanel) closePanel(signupPanel, signUpBtn);
      panel.classList.add('open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    // Toggle panel visibility
    function togglePanel(panel: HTMLElement, btn: HTMLElement): void {
      if (panel.classList.contains('open')) {
        closePanel(panel, btn);
      } else {
        openPanel(panel, btn);
        const firstInput = panel.querySelector('input');
        if (firstInput) (firstInput as HTMLElement).focus();
      }
    }

    // Event listeners for panel buttons
    if (signUpBtn && signupPanel) {
      signUpBtn.addEventListener('click', () => togglePanel(signupPanel, signUpBtn));
    }

    // Login button on page
    if (loginBtnPage && loginPanel) {
      loginBtnPage.addEventListener('click', () => togglePanel(loginPanel, loginBtnPage));
    }

    // Cancel buttons to close panels
    const signupCancel = document.getElementById('signupCancel');
    if (signupCancel) signupCancel.addEventListener('click', () => closePanel(signupPanel, signUpBtn));
    
    const loginCancel = document.getElementById('loginCancel');
    if (loginCancel) loginCancel.addEventListener('click', () => closePanel(loginPanel, loginBtnPage));
    
    // SIGN UP FORM HANDLER ------------------------------------------------------------------------------------------------
    const signupForm = document.getElementById('signupForm') as HTMLFormElement | null;
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        
        // Prevent default form submission
        e.preventDefault();
        
        // Validate form
        if (!signupForm.reportValidity()) return;
        
        // Parsing form data
        const data = Object.fromEntries(new FormData(signupForm).entries()) as { username: string; name: string; email: string; password: string };
        
        // Backend registration first
        const result = await tryBackendRegister(data);
        
        // SUCCESS
        if (result && result.success) {return;}
        
        // CONFLICT: Username or email already in use
        if (result && result.status === 409) {
          alert('Username or email already in use. Please choose another.');
          return;
        }

        // FALLBACK: Local demo sign-up
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

    // LOGIN FORM HANDLER ------------------------------------------------------------------------------------------------
    const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        
        // Prevent default form submission
        e.preventDefault();
        
        // Validate form
        if (!loginForm.reportValidity()) return;
        
        // Parsing form data
        const data = Object.fromEntries(new FormData(loginForm).entries()) as { identifier: string; password: string };
        
        // Clear previous error and attempt backend login
        const errorEl = document.getElementById('loginError');
        const backendResult = await tryBackendLogin(data);
        
        // SUCCESS
        if (backendResult && backendResult.success) {return;}
        
        // CONFLICT: Invalid credentials
        if (backendResult && backendResult.status === 401) {
          if (errorEl) { errorEl.textContent = 'Invalid credentials.'; errorEl.hidden = false; } return; }
        
        // CONFLICT: User not found
        const user = getUserData();
        if (!user) {
          if (errorEl) { errorEl.textContent = 'No account found. Please sign up first.'; errorEl.hidden = false; }
          return;
        }

        // FALLBACK: Local demo login check
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
