// ========================================
// AUTHENTICATION MODULE - FIREBASE VERSION
// ========================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'currentUser'
};




/**
 * Handle user signup with Firebase
 */
async function handleSignup(e) {
    e.preventDefault();
    
    const errorDisplay = document.getElementById('signupError');
    errorDisplay.textContent = '';
    
    try {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        
        // Validation
        if (!email || !password) {
            throw new Error('All fields are required');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        // Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('✅ User registered:', email);
        
        // Clear form and show success
        document.getElementById('signupForm').reset();
        updateStatus('Account created successfully!', 'success');
        
    } catch (error) {
        console.error('Signup error:', error);
        errorDisplay.textContent = error.message;
    }
}

/**
 * Handle user signin with Firebase
 */
async function handleSignin(e) {
    e.preventDefault();
    
    const errorDisplay = document.getElementById('signinError');
    errorDisplay.textContent = '';
    
    try {
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;
        
        if (!email || !password) {
            throw new Error('All fields are required');
        }
        
        // Sign in with Firebase Auth
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ User logged in:', email);
        
        // Clear form
        document.getElementById('signinForm').reset();
        updateStatus('Welcome back!', 'success');
        
    } catch (error) {
        console.error('Signin error:', error);
        errorDisplay.textContent = error.message;
        document.getElementById('signinPassword').value = '';
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        console.log('✅ User logged out');
        updateStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        updateStatus('Logout failed', 'error');
    }
}

/**
 * Get current logged in user
 */
function getCurrentUser() {
    return firebase.auth().currentUser;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!firebase.auth().currentUser;
}

// Keep the rest of your existing functions unchanged:
// showAuth(), showDashboard(), toggleAuthView(), isValidEmail(), etc.


/**
 * Get current logged in user from Firebase
 * @returns {object|null} Firebase user object or null
 */
function getCurrentUser() {
    return firebase.auth().currentUser;
}

/**
 * Check if user is authenticated with Firebase
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
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
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
 * Initialize authentication system
 */
function initAuth() {
    console.log('🔐 Initializing Firebase authentication...');
    
    // Firebase auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('✅ User logged in:', user.email);
            showDashboard();
        } else {
            // User is signed out
            console.log('🔒 User logged out');
            showAuth();
        }
    });
    
    // Setup event listeners
    setupAuthListeners();
}

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

console.log('✅ Firebase Auth.js loaded successfully');
