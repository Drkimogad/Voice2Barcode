// ========================================
// AUTHENTICATION MODULE
// ========================================
// Add to auth.js at the top
function checkOnlineStatus() {
  if (!navigator.onLine) {
    window.location.href = '/offline.html';
    return false;
  }
  return true;
}

// Add missing utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function updateStatus(message, type) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }
  console.log(`📢 ${type.toUpperCase()}: ${message}`);
}


function initAuth() {
  if (!checkOnlineStatus()) return;
  
  console.log('🔐 Initializing authentication...');
  
  // Replace localStorage check with Firebase auth state listener
  firebase.auth().onAuthStateChanged((user) => {
      if (user) {
          // User is signed in with Firebase
          console.log('✅ Firebase user logged in:', user.email);
          showDashboard();
      } else {
          // User is signed out
          console.log('🔒 No Firebase user');
          showAuth();
      }
  });
  
  // Setup event listeners
  setupAuthListeners();
}

/**
 * Setup authentication event listeners
 */
function setupAuthListeners() {
    // Sign Up Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Sign In Form
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
    }
    
    // Toggle between signup and signin
    const showSigninBtn = document.getElementById('showSignin');
    if (showSigninBtn) {
        showSigninBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView('signin');
        });
    }
    
    const showSignupBtn = document.getElementById('showSignup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView('signup');
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Handle user signup
 * @param {Event} e - Form submit event
 */
async function handleSignup(e) {
    e.preventDefault();
    // Add offline check
    if (!navigator.onLine) {
        window.location.href = '/offline.html';
        return;
    }
    
    const errorDisplay = document.getElementById('signupError');
    errorDisplay.textContent = '';
    
    try {
        // Get form values
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        
        // Validation
        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }
        
        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
          // REPLACE localStorage with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('✅ Firebase user registered:', email);
        
        // Clear form
        document.getElementById('signupForm').reset();
        
        // Show success and switch to signin
        updateStatus('Account created successfully! Please sign in.', 'success');
        setTimeout(() => toggleAuthView('signin'), 1500);  // switches between signup and signin 
        
        console.log('✅ User registered:', username);
        
    } catch (error) {
        errorDisplay.textContent = error.message;
        console.error('Signup error:', error);
    }
}

/**
 * Handle user signin
 * @param {Event} e - Form submit event
 */
async function handleSignin(e) {
    e.preventDefault();
    // Add offline check
    if (!navigator.onLine) {
        window.location.href = '/offline.html';
        return;
    }
    
    const errorDisplay = document.getElementById('signinError');
    errorDisplay.textContent = '';
    
    try {
        // Get form values
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;
        
        // Validation
        if (!email || !password) {
            throw new Error('All fields are required');
        }
        // REPLACE localStorage check with Firebase Auth
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ Firebase user logged in:', email);
        
        // Clear form
        document.getElementById('signinForm').reset();
        
        // Show dashboard
        updateStatus('Welcome back!', 'success');
        
        // FIXED: Remove undefined username reference
        console.log('✅ User logged in:', email);
        
    } catch (error) {
        errorDisplay.textContent = error.message;
        document.getElementById('signinPassword').value = '';
        console.error('Firebase signin error:', error);
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        // Clear local session data
        localStorage.removeItem('lastActivePage');
        // Add any other local storage cleanup here
        
        // Try Firebase signOut if online
        if (navigator.onLine) {
            await firebase.auth().signOut();
            console.log('✅ Firebase user logged out');
            updateStatus('Logged out successfully', 'success');
        } else {
            // Offline logout - just clear local data
            console.log('🔌 Offline logout - local data cleared');
            updateStatus('Logged out (offline mode)', 'success');
        }
        
        // NO NEED to call showAuth() - Firebase auth state listener handles it automatically
        
    } catch (error) {
        console.error('Logout error:', error);
        updateStatus('Logout completed', 'success');
        // Firebase auth state listener will still handle the UI
    }
}

/**
 * Get current logged in user
 * @returns {object|null} User object or null
 */
function getCurrentUser() {
    // REPLACE localStorage with Firebase currentUser
    return firebase.auth().currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
    // REPLACE localStorage check with Firebase currentUser
    return !!firebase.auth().currentUser;
}

/**
 * Show authentication section
 */
function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('infoBanner').style.display = 'block';
    
    // Show signup by default
    toggleAuthView('signup');
}

/**
 * Show dashboard section
 */
function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('infoBanner').style.display = 'none';
    
    // Initialize dashboard if function exists
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
}

/**
 * Toggle between signup and signin views
 * @param {string} view - 'signup' or 'signin'
 */
function toggleAuthView(view) {
    const signupContainer = document.getElementById('signupContainer');
    const signinContainer = document.getElementById('signinContainer');
    
    if (view === 'signup') {
        signupContainer.style.display = 'block';
        signinContainer.style.display = 'none';
        // Clear errors
        document.getElementById('signupError').textContent = '';
    } else {
        signupContainer.style.display = 'none';
        signinContainer.style.display = 'block';
        // Clear errors
        document.getElementById('signinError').textContent = '';
    }
}

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

console.log('✅ Auth.js loaded successfully');
