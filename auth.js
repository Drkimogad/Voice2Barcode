// ========================================
// AUTHENTICATION MODULE - PRODUCTION READY
// ========================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'currentUser'
};

// Debug state tracking
let authDebug = {
    initCalled: false,
    authStateChangedFired: false,
    showDashboardCalled: false,
    showAuthCalled: false
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

/**
 * Show authentication section
 */
/**
 * Enhanced showAuth with comprehensive checks
 */
function showAuth() {
    console.group('🔑 SHOW AUTH');
    authDebug.showAuthCalled = true;
    
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('infoBanner').style.display = 'block';
    
    // Verify auth elements
    const authEl = document.getElementById('authSection');
    console.log('🎯 Auth Element:', authEl);
    console.log('👀 Auth Display:', authEl.style.display);
    
    toggleAuthView('signup');
    console.groupEnd();
}


/**
 * Show dashboard section
 */
/**
 * Enhanced showDashboard with layout debugging
 */
function showDashboard() {
    console.group('📊 SHOW DASHBOARD');
    authDebug.showDashboardCalled = true;
    
    // Hide auth, show dashboard
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('infoBanner').style.display = 'none';
    
    // Verify DOM elements exist
    const dashboardEl = document.getElementById('dashboardSection');
    console.log('🎯 Dashboard Element:', dashboardEl);
    console.log('👀 Dashboard Display:', dashboardEl.style.display);
    console.log('📏 Dashboard Dimensions:', dashboardEl.offsetWidth, 'x', dashboardEl.offsetHeight);
    
    // Check for links section specifically
    const linksSection = document.querySelector('[data-section="links"]');
    console.log('🔗 Links Section:', linksSection);
    console.log('👀 Links Display:', linksSection?.style.display);
    console.log('📏 Links Dimensions:', linksSection?.offsetWidth, 'x', linksSection?.offsetHeight);
    
    // Initialize dashboard with error handling
    if (typeof initDashboard === 'function') {
        console.log('🚀 Initializing dashboard...');
        try {
            initDashboard();
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
        }
    } else {
        console.error('❌ initDashboard function not found!');
    }
    
    console.groupEnd();
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
 * Enhanced initialization with comprehensive logging
 */
function initAuth() {
    console.group('🔐 AUTH INITIALIZATION');
    console.log('📋 DOM Ready State:', document.readyState);
    console.log('🏗️ Firebase App:', typeof firebase !== 'undefined' ? 'Loaded' : 'MISSING');
    console.log('🔑 Firebase Auth:', typeof firebase.auth !== 'undefined' ? 'Loaded' : 'MISSING');
    
    authDebug.initCalled = true;

    // Firebase auth state listener with enhanced logging
    firebase.auth().onAuthStateChanged((user) => {
        console.group('🔄 AUTH STATE CHANGE');
        console.log('👤 User Object:', user);
        console.log('📧 User Email:', user?.email);
        console.log('🆔 User UID:', user?.uid);
        
        authDebug.authStateChangedFired = true;

        if (user) {
            console.log('✅ AUTHENTICATED - Showing dashboard');
            showDashboard();
        } else {
            console.log('🔒 NOT AUTHENTICATED - Showing auth form');
            showAuth();
        }
        console.groupEnd();
    });

    setupAuthListeners();
    console.groupEnd();
}


/**
 * Debug function to check current state
 */
function debugAuthState() {
    console.group('🐛 AUTH DEBUG REPORT');
    console.log('🔧 Init Called:', authDebug.initCalled);
    console.log('🔄 Auth State Changed:', authDebug.authStateChangedFired);
    console.log('📊 Show Dashboard Called:', authDebug.showDashboardCalled);
    console.log('🔑 Show Auth Called:', authDebug.showAuthCalled);
    console.log('👤 Current User:', getCurrentUser());
    console.log('🔐 Is Authenticated:', isAuthenticated());
    console.log('🏗️ Dashboard Element Display:', document.getElementById('dashboardSection')?.style.display);
    console.log('🔗 Links Section Display:', document.querySelector('[data-section="links"]')?.style.display);
    console.groupEnd();
}

// Enhanced DOM ready check
if (document.readyState === 'loading') {
    console.log('⏳ DOM Loading - Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎉 DOM Content Loaded - Initializing Auth');
        initAuth();
    });
} else {
    console.log('⚡ DOM Ready - Initializing Auth Immediately');
    initAuth();
}

console.log('✅ Firebase Auth.js loaded successfully');
