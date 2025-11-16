/*
  File: accountSettings.ts
  
  Functionalities:
  - Load user data from localStorage on page load
  - Populate form fields with current user information
  - Allow editing of name, major, and year
  - Show/hide React button based on admin status
  - Save changes to backend and update localStorage
  - Display success/error messages
*/

// Helper functions to check login status and get user data
function isUserLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

function getUserData(): Record<string, any> | null {
  const userData = localStorage.getItem("userData");
  return userData ? JSON.parse(userData) : null;
}

// ===================== HELPER FUNCTIONS =====================

/**
 * Format error messages for display
 */
function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An error occurred. Please try again.';
}

/**
 * Show message to user
 */
function showMessage(elementId: string, message: string, autoDismiss: boolean = true): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.style.display = 'block';

  if (autoDismiss) {
    setTimeout(() => {
      element.style.display = 'none';
    }, 4000);
  }
}

/**
 * Convert image file to base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image using canvas
 */
function compressImage(base64: string, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      // Create canvas and draw compressed image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      reject(new Error('Could not load image'));
    };
    img.src = base64;
  });
}

/**
 * Handle profile picture file selection
 */
async function handleProfilePictureSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  
  if (!files || files.length === 0) return;
  
  const file = files[0];
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showMessage('errorMessage', 'Please select an image file');
    return;
  }
  
  // Validate file size (max 10MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    showMessage('errorMessage', 'Image size must be less than 10MB');
    return;
  }
  
  try {
    showMessage('successMessage', 'Compressing image...');
    
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Compress the image
    const compressed = await compressImage(base64, 400, 400, 0.7);
    
    // Check compressed size (must be less than 1MB after compression)
    if (compressed.length > 1024 * 1024) {
      showMessage('errorMessage', 'Compressed image still too large. Try a smaller or lower quality image.');
      return;
    }
    
    // Update preview
    const preview = document.getElementById('profilePicturePreview') as HTMLImageElement;
    if (preview) {
      preview.src = compressed;
    }
    
    // Store in session for saving
    sessionStorage.setItem('pendingProfilePicture', compressed);
    
    showMessage('successMessage', '✓ Picture updated. Click Save Changes to confirm.');
  } catch (err) {
    console.error('Error processing image:', err);
    showMessage('errorMessage', 'Error processing image');
  }
}

/**
 * Handle remove profile picture
 */
function handleRemoveProfilePicture(): void {
  const preview = document.getElementById('profilePicturePreview') as HTMLImageElement;
  if (preview) {
    preview.src = '../assets/avatar_placeholder.png';
  }
  
  const fileInput = document.getElementById('profilePicture') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
  
  sessionStorage.setItem('pendingProfilePicture', '');
  showMessage('successMessage', '✓ Profile picture will be removed. Click Save Changes to confirm.');
}

/**
 * Validate form data
 */
function validateFormData(data: any): { valid: boolean; error?: string } {
  if (data.name && typeof data.name !== 'string') {
    return { valid: false, error: 'Full name must be a string' };
  }
  if (data.major && typeof data.major !== 'string') {
    return { valid: false, error: 'Major must be a string' };
  }
  if (data.year && typeof data.year !== 'string') {
    return { valid: false, error: 'Year must be a string' };
  }
  return { valid: true };
}

// ===================== MAIN FUNCTIONS =====================

/**
 * Load user data from localStorage and populate form
 */
function loadUserData(): void {
  console.log('loadUserData called');
  
  if (!isUserLoggedIn()) {
    console.log('User not logged in, redirecting to login');
    window.location.href = 'login-signup.html';
    return;
  }

  const userData = getUserData();
  console.log('User data from localStorage:', userData);
  
  if (!userData) {
    console.log('No user data found, redirecting to login');
    window.location.href = 'login-signup.html';
    return;
  }

  // Populate form fields
  const usernameField = document.getElementById('username') as HTMLInputElement;
  const emailField = document.getElementById('email') as HTMLInputElement;
  const nameField = document.getElementById('name') as HTMLInputElement;
  const majorField = document.getElementById('major') as HTMLInputElement;
  const yearField = document.getElementById('year') as HTMLSelectElement;
  const profilePicturePreview = document.getElementById('profilePicturePreview') as HTMLImageElement;

  console.log('Form fields found:', {
    username: !!usernameField,
    email: !!emailField,
    name: !!nameField,
    major: !!majorField,
    year: !!yearField,
    profilePicturePreview: !!profilePicturePreview
  });

  if (usernameField) {
    usernameField.value = userData.username || '';
    console.log('Set username to:', usernameField.value);
  }
  if (emailField) {
    emailField.value = userData.email || '';
    console.log('Set email to:', emailField.value);
  }
  if (nameField) {
    nameField.value = userData.name || '';
    console.log('Set name to:', nameField.value);
  }
  if (majorField) {
    majorField.value = userData.major || '';
    console.log('Set major to:', majorField.value);
  }
  if (yearField) {
    yearField.value = userData.year || '';
    console.log('Set year to:', yearField.value);
  }
  if (profilePicturePreview) {
    profilePicturePreview.src = userData.profilePicture || '../assets/avatar_placeholder.png';
    console.log('Set profile picture to:', profilePicturePreview.src);
  }

  // Handle admin-only features
  handleAdminVisibility(userData.isAdmin);
}

/**
 * Show/hide React button based on admin status
 */
function handleAdminVisibility(isAdmin: boolean): void {
  const experimentalSection = document.getElementById('experimentalSection');
  if (!experimentalSection) return;

  // Only show experimental features if user is admin
  if (!isAdmin) {
    experimentalSection.style.display = 'none';
  } else {
    experimentalSection.style.display = 'block';
  }
}

/**
 * Save changes to backend
 */
async function saveChanges(): Promise<void> {
  const userData = getUserData();
  if (!userData) {
    showMessage('errorMessage', 'User data not found. Please log in again.');
    return;
  }

  // Get form values
  const nameField = document.getElementById('name') as HTMLInputElement;
  const majorField = document.getElementById('major') as HTMLInputElement;
  const yearField = document.getElementById('year') as HTMLSelectElement;

  const updates: any = {
    name: nameField?.value || '',
    major: majorField?.value || '',
    year: yearField?.value || '',
  };

  // Check for pending profile picture
  const pendingProfilePicture = sessionStorage.getItem('pendingProfilePicture');
  if (pendingProfilePicture !== null) {
    updates.profilePicture = pendingProfilePicture;
  }

  // Validate
  const validation = validateFormData(updates);
  if (!validation.valid) {
    showMessage('errorMessage', validation.error || 'Invalid input');
    return;
  }

  try {
    // Call backend to update user
    const response = await fetch(`/api/user/${userData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const result = await response.json();

    // Update localStorage with new data
    const updatedUserData = {
      ...userData,
      name: result.name,
      major: result.major,
      year: result.year,
      profilePicture: result.profilePicture,
    };
    localStorage.setItem('userData', JSON.stringify(updatedUserData));
    
    // Clear pending picture from session
    sessionStorage.removeItem('pendingProfilePicture');

    showMessage('successMessage', '✓ Your changes have been saved successfully!');
  } catch (err) {
    console.error('Error saving changes:', err);
    showMessage('errorMessage', formatErrorMessage(err));
  }
}

/**
 * Cancel changes and reload form
 */
function cancelChanges(): void {
  loadUserData();
  showMessage('successMessage', '');
  showMessage('errorMessage', '');
}

// ===================== EVENT LISTENERS =====================

/**
 * Initialize event listeners when DOM is ready
 */
function initializeEventListeners(): void {
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const uploadProfilePictureBtn = document.getElementById('uploadProfilePictureBtn');
  const removeProfilePictureBtn = document.getElementById('removeProfilePictureBtn');
  const profilePictureInput = document.getElementById('profilePicture') as HTMLInputElement;

  if (saveBtn) {
    saveBtn.addEventListener('click', saveChanges);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelChanges);
  }

  if (uploadProfilePictureBtn) {
    uploadProfilePictureBtn.addEventListener('click', () => {
      profilePictureInput?.click();
    });
  }

  if (profilePictureInput) {
    profilePictureInput.addEventListener('change', handleProfilePictureSelect);
  }

  if (removeProfilePictureBtn) {
    removeProfilePictureBtn.addEventListener('click', handleRemoveProfilePicture);
  }

  // Handle admin console button
  const reactBtn = document.getElementById('reactBtn') as HTMLButtonElement | null;
  if (reactBtn) {
    reactBtn.addEventListener('click', () => {
      const userData = getUserData();
      const adminName = userData?.name || userData?.username || 'Admin';
      const encodedName = encodeURIComponent(adminName);
      window.location.href = `http://localhost:5173/?name=${encodedName}`;
    });
  }
}

// ===================== INITIALIZATION =====================

// Load user data and set up event listeners when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initializeEventListeners();
  });
} else {
  loadUserData();
  initializeEventListeners();
}
