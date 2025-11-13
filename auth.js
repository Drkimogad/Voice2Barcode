// ========================================
// AUTHENTICATION MODULE - OFFLINE FIXED
// ========================================

// STATE TRACKING FOR OFFLINE RECOVERY
let lastKnownState = localStorage.getItem('lastKnownState') || 'unknown';
let isCheckingOnlineStatus = false;

// REPLACE LINES 7-14 with this SMART ONLINE CHECK
function checkOnlineStatus() {
  if (!navigator.onLine) {
    console.log('🔌 Offline - Checking previous state:', lastKnownState);
    
    // Only redirect to offline.html if we weren't in dashboard as authenticated user
    if (lastKnownState !== 'dashboard-authenticated') {
      console.log('🔄 Redirecting to offline page');
      window.location.href = '/offline.html';
      return false;
    }
    
    // If we were authenticated in dashboard, stay and show offline banner
    console.log('📱 Offline but authenticated - staying in dashboard');
    showOfflineBanner();
    return false;
  }
  return true;
}

// NEW FUNCTION: Track user state
function trackUserState(state) {
  lastKnownState = state;
  localStorage.setItem('lastKnownState', state);
  console.log('📝 State tracked:', state);
}

// NEW FUNCTION: Show offline banner in dashboard
function showOfflineBanner() {
  // Create or show offline banner if in dashboard
  const dashboardSection = document.getElementById('dashboardSection');
  if (dashboardSection && !document.getElementById('offlineBanner')) {
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offlineBanner';
    offlineBanner.style.cssText = `
      background: #ff6b35;
      color: white;
      padding: 10px;
      text-align: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      font-weight: bold;
    `;
    offlineBanner.textContent = '📵 You are currently offline. Some features may be unavailable.';
    document.body.appendChild(offlineBanner);
  }
}

// NEW FUNCTION: Remove offline banner
function hideOfflineBanner() {
  const offlineBanner = document.getElementById('offlineBanner');
  if (offlineBanner) {
    offlineBanner.remove();
  }
}

// ENHANCE LINES 19-32 - OFFLINE-AWARE INIT
function initAuth() {
  console.log('🔐 Initializing authentication...');
  
  // Track that we're initializing
  trackUserState('initializing');
  
  // Setup connection event listeners FIRST
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);
  
  // Check online status without immediate redirect
  if (!navigator.onLine) {
    console.log('🔌 Starting offline - using last known state:', lastKnownState);
    
    // If we have Firebase user but offline, show dashboard
    firebase.auth().onAuthStateChanged((user) => {
      if (user && lastKnownState === 'dashboard-authenticated') {
        console.log('✅ Offline but authenticated - showing dashboard');
        showDashboard();
        showOfflineBanner();
      } else if (!user) {
        console.log('🔒 Offline and not authenticated - redirecting');
        window.location.href = '/offline.html';
      }
    });
    return;
  }
  
  // ONLINE: Normal Firebase auth flow
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ Firebase user logged in:', user.email);
      trackUserState('dashboard-authenticated');
      hideOfflineBanner();
      showDashboard();
    } else {
      console.log('🔒 No Firebase user');
      trackUserState('auth-page');
      showAuth();
    }
  });
  
  // Setup event listeners
  setupAuthListeners();
}

// NEW FUNCTION: Handle online event
function handleOnlineEvent() {
  console.log('✅ Online event - hiding offline banner');
  hideOfflineBanner();
  
  // If we're in dashboard, refresh data if needed
  if (lastKnownState === 'dashboard-authenticated' && typeof initDashboard === 'function') {
    console.log('🔄 Online - refreshing dashboard data');
    initDashboard();
  }
}

// NEW FUNCTION: Handle offline event  
function handleOfflineEvent() {
  console.log('🔌 Offline event detected');
  
  // If we're authenticated and in dashboard, show banner but don't redirect
  const user = firebase.auth().currentUser;
  if (user && document.getElementById('dashboardSection')?.style.display !== 'none') {
    console.log('📱 Offline but authenticated in dashboard - showing banner');
    trackUserState('dashboard-authenticated');
    showOfflineBanner();
  } else {
    console.log('🔄 Offline and not in dashboard - tracking state');
    trackUserState('offline-page');
  }
}

// KEEP ALL YOUR EXISTING FUNCTIONS BELOW EXACTLY AS THEY ARE - ONLY MODIFY handleLogout:

/**
 * Handle user logout - ENHANCE OFFLINE SUPPORT
 */
async function handleLogout() {
  try {
    // Clear local session data
    localStorage.removeItem('lastKnownPage');
    localStorage.removeItem('lastKnownState');
    
    // Track logout state
    trackUserState('logged-out');
    
    // Try Firebase signOut if online
    if (navigator.onLine) {
      await firebase.auth().signOut();
      console.log('✅ Firebase user logged out');
      updateStatus('Logged out successfully', 'success');
    } else {
      // Offline logout - clear local state only
      console.log('🔌 Offline logout - local state cleared');
      updateStatus('Logged out (offline mode)', 'success');
      
      // Redirect to auth page immediately for offline logout
      showAuth();
    }
    
  } catch (error) {
    console.error('Logout error:', error);
    updateStatus('Logout completed', 'success');
    showAuth(); // Ensure we show auth page even on error
  }
}

// KEEP EVERYTHING ELSE EXACTLY AS IS:

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

console.log('✅ Auth.js loaded successfully - OFFLINE FIXED');
