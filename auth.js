// ========================================
// 🆕 SIMPLIFIED CONNECTION UI CONTROLLER
// ========================================

/**
 * 🆕 ONLY controls UI - NEVER redirects
 */
function handleConnectionChange(isOnline) {
    console.log(`🌐 UI Controller: ${isOnline ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
    
    if (isOnline) {
        hideOfflineDashboardUI();
        // Process any pending offline messages
        if (typeof processOfflineQueue === 'function') {
            setTimeout(processOfflineQueue, 1000);
        }
    } else {
        showOfflineDashboardUI();
    }
}

/**
 * 🆕 Initialize SIMPLE connection monitoring
 */
function initConnectionUI() {
    console.log('📡 Initializing Connection UI Controller...');
    
    // Set initial state
    handleConnectionChange(navigator.onLine);
    
    // Simple event listeners - ONLY for UI updates
    window.addEventListener('online', () => {
        console.log('📶 Online - Updating UI only');
        handleConnectionChange(true);
    });
    
    window.addEventListener('offline', () => {
        console.log('📵 Offline - Updating UI only');
        handleConnectionChange(false);
    });
    
    console.log('✅ Connection UI Controller ready');
}

/**
 * 🆕 Show offline UI on dashboard without redirecting
 */
function showOfflineDashboardUI() {
    // Only show if we're actually on a dashboard page
    const dashboardSection = document.getElementById('dashboardSection');
    const authSection = document.getElementById('authSection');
    
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        console.log('🎨 Showing offline dashboard UI');
        
        // Create or update offline banner
        let offlineBanner = document.getElementById('dashboardOfflineBanner');
        if (!offlineBanner) {
            offlineBanner = document.createElement('div');
            offlineBanner.id = 'dashboardOfflineBanner';
            offlineBanner.style.cssText = `
                background: #fef3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 12px;
                text-align: center;
                font-weight: bold;
                position: sticky;
                top: 0;
                z-index: 1000;
            `;
            document.body.insertBefore(offlineBanner, document.body.firstChild);
        }
        
        offlineBanner.innerHTML = '📵 Offline Mode - Some features limited. Working to restore connection...';
        offlineBanner.style.display = 'block';
        
        // Disable online-only features
        const onlineOnlyButtons = document.querySelectorAll('#generateLinkQRBtn, #textConvertBtn');
        onlineOnlyButtons.forEach(btn => {
            if (btn) btn.disabled = true;
        });
    }
}

/**
 * 🆕 Hide offline UI when back online
 */
function hideOfflineDashboardUI() {
    const offlineBanner = document.getElementById('dashboardOfflineBanner');
    if (offlineBanner) {
        offlineBanner.style.display = 'none';
    }
    
    // Re-enable online-only features
    const onlineOnlyButtons = document.querySelectorAll('#generateLinkQRBtn, #textConvertBtn');
    onlineOnlyButtons.forEach(btn => {
        if (btn) btn.disabled = false;
    });
}


// 🎯 REAL CONNECTION CHECK (like in offline.html)
async function checkRealConnection() {
    try {
        const isGitHub = window.location.hostname.includes('github.io');
        const basePath = isGitHub ? '/MemoryinQR' : '/';
        const url = basePath + 'online.txt?ts=' + Date.now();
        
        console.log('🌐 Checking connection at:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            console.log('❌ online.txt response not OK');
            return false;
        }
        
        const text = await response.text();
        const isOnline = text.trim() === 'OK';
        console.log('📡 Online check result:', isOnline);
        return isOnline;
        
    } catch (error) {
        console.log('❌ Online check failed:', error.message);
        return false;
    }
}

// 🔥 FIREBASE OFFLINE PERSISTENCE
function setupFirebaseOfflinePersistence() {
    console.log('💾 Setting up Firebase offline persistence...');
    
    firebase.firestore().enablePersistence()
        .then(() => {
            console.log('✅ Firebase offline persistence enabled');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open - persistence limited to one tab');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Browser lacks persistence support');
            } else {
                console.warn('⚠️ Firestore persistence error:', err);
            }
        });
}

// ========================================
// EXISTING AUTH FUNCTIONS - OFFLINE FORTIFIED
// ========================================
function initAuth() {
    console.log('🔐 INIT AUTH: Starting authentication...');
    
    // 🆕 Initialize SIMPLE UI controller
    initConnectionUI();
    
    // Firebase auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        console.log(`👤 Auth State: ${user ? 'User: ' + user.email : 'No user'}`);
        
        if (user) {
            console.log('✅ User authenticated, showing dashboard...');
            showDashboard();
        } else {
            console.log('🔒 No user, showing auth UI...');
            showAuth();
        }
    });
    
    // Setup Firebase offline support
    setupFirebaseOfflinePersistence();
    
    // Setup event listeners
    setupAuthListeners();
    
    console.log('✅ Auth initialization complete');
}

/**
 * Handle user signup - OFFLINE FORTIFIED
 */
async function handleSignup(e) {
    e.preventDefault();
    console.log('📝 SIGNUP: Processing signup request...');
    
// 🆕 SIMPLIFIED OFFLINE CHECK - Just show error, don't redirect
const isReallyOnline = await checkRealConnection();
if (!isReallyOnline) {
    console.log('❌ Auth blocked - no connection');
    updateStatus('No internet connection detected', 'error');
    return;
}
    
    const errorDisplay = document.getElementById('signupError');
    errorDisplay.textContent = '';
    
    try {
        console.log('✅ Online confirmed - proceeding with signup...');
        
        // Get form values
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        
        console.log(`📧 Signup attempt for: ${email}, Username: ${username}`);
        
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
        
        // Firebase Auth
        console.log('🔥 Creating Firebase user...');
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('✅ Firebase user registered:', email);
        
        // Clear form
        document.getElementById('signupForm').reset();
        
        // Show success and switch to signin
        updateStatus('Account created successfully! Please sign in.', 'success');
        setTimeout(() => toggleAuthView('signin'), 1500);
        
        console.log('✅ User registration complete');
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        errorDisplay.textContent = error.message;
    }
}

/**
 * Handle user signin - OFFLINE FORTIFIED  
 */
async function handleSignin(e) {
    e.preventDefault();
    console.log('🔑 SIGNIN: Processing signin request...');
    
   // 🆕 SIMPLIFIED OFFLINE CHECK - Just show error, don't redirect
const isReallyOnline = await checkRealConnection();
    console.log('🔑 SIGNIN: Online check result:', await checkRealConnection());

if (!isReallyOnline) {
    console.log('❌ Auth blocked - no connection');
    updateStatus('No internet connection detected', 'error');
    return;
}
    
    const errorDisplay = document.getElementById('signinError');
    errorDisplay.textContent = '';
    
    try {
        console.log('✅ Online confirmed - proceeding with signin...');
        
        // Get form values
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;
        
        console.log(`🔑 Signin attempt for: ${email}`);
        
        // Validation
        if (!email || !password) {
            throw new Error('All fields are required');
        }
        
        // Firebase Auth
        console.log('🔥 Authenticating with Firebase...');
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ Firebase user authenticated:', email);
        
        // Clear form
        document.getElementById('signinForm').reset();
        
        // Show dashboard
        updateStatus('Welcome back!', 'success');
        
        console.log('✅ User signin complete');
        
    } catch (error) {
        console.error('❌ Firebase signin error:', error);
        errorDisplay.textContent = error.message;
        document.getElementById('signinPassword').value = '';
    }
}

/**
 * Handle user logout - OFFLINE FORTIFIED
 */
async function handleLogout() {
    console.log('🚪 LOGOUT: Processing logout request...');
    
    try {
        localStorage.removeItem('lastActivePage');
        console.log('🧹 Local storage cleaned');
        
        if (navigator.onLine) {
            console.log('🌐 Online logout - signing out from Firebase...');
            await firebase.auth().signOut();
            console.log('✅ Firebase user logged out');
        } else {
            console.log('📴 Offline logout - clearing local data only');
            console.log('✅ Local data cleared');
        }
        
        // 🆕 FORCE NAVIGATION WHEN OFFLINE
        if (!navigator.onLine) {
            console.log('🔄 Offline logout - forcing navigation to trigger service worker');
            window.location.reload(); // Simplest solution
        }
        // If online, Firebase auth listener will handle UI automatically
        
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// ========================================
// EXISTING AUTH FUNCTIONS (UNCHANGED)
// ========================================

function setupAuthListeners() {
    console.log('🎧 Setting up auth event listeners...');
    
    // Sign Up Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('✅ Signup form listener added');
    }
    
    // Sign In Form
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSignin);
        console.log('✅ Signin form listener added');
    }
    
    // Toggle between signup and signin
    const showSigninBtn = document.getElementById('showSignin');
    if (showSigninBtn) {
        showSigninBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView('signin');
        });
        console.log('✅ Show signin listener added');
    }
    
    const showSignupBtn = document.getElementById('showSignup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView('signup');
        });
        console.log('✅ Show signup listener added');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout listener added');
    }
    
    console.log('✅ All auth listeners setup complete');
}

function showAuth() {
    console.log('👤 Showing authentication UI...');
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('infoBanner').style.display = 'block';
    
    // Show signup by default
    toggleAuthView('signup');
    console.log('✅ Auth UI displayed');
}

function showDashboard() {
    console.log('📊 Showing dashboard UI...');
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('infoBanner').style.display = 'none';
    
    // Initialize dashboard if function exists
    if (typeof initDashboard === 'function') {
        console.log('🚀 Initializing dashboard...');
        initDashboard();
    }
    console.log('✅ Dashboard UI displayed');
}

function toggleAuthView(view) {
    console.log(`🔄 Toggling auth view to: ${view}`);
    const signupContainer = document.getElementById('signupContainer');
    const signinContainer = document.getElementById('signinContainer');
    
    if (view === 'signup') {
        signupContainer.style.display = 'block';
        signinContainer.style.display = 'none';
        document.getElementById('signupError').textContent = '';
        console.log('✅ Signup view activated');
    } else {
        signupContainer.style.display = 'none';
        signinContainer.style.display = 'block';
        document.getElementById('signinError').textContent = '';
        console.log('✅ Signin view activated');
    }
}

function getCurrentUser() {
    return firebase.auth().currentUser;
}

function isAuthenticated() {
    return !!firebase.auth().currentUser;
}

// ========================================
// 🆕 CLEAN INITIALIZATION
// ========================================
console.log('🚀 AUTH.JS: Loading...');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM Ready - Starting auth...');
        initAuth();
    });
} else {
    console.log('✅ DOM Already Ready - Starting auth...');
    initAuth();
}

console.log('✅ Auth.js loaded - UI controller active');
