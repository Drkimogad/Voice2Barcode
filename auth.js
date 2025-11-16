// ========================================

/*DOM Ready → Initialize Connection Monitor → initAuth → Check Status → Show UI
     ↑                                                                  ↓
     └── Online/Offline Events ←── Real-time Monitoring ←── Firebase Auth*/

// AUTHENTICATION MODULE - OFFLINE FORTIFIED
// ========================================

// 🔧 GLOBAL OFFLINE MANAGEMENT SYSTEM
console.log('🛠️ Initializing Offline Management System...');

// Global connection state
window.connectionState = {
    isOnline: navigator.onLine,
    lastChecked: new Date().toISOString(),
    retryCount: 0
};

// ✅ FIX: Synchronized offline redirect with execution stop
function checkOnlineStatus() {
    const wasOnline = window.connectionState.isOnline;
    window.connectionState.isOnline = navigator.onLine;
    window.connectionState.lastChecked = new Date().toISOString();
    
    console.log(`🌐 Connection Check: ${window.connectionState.isOnline ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
    
    // 🆕 CRITICAL FIX: Only redirect from auth pages, NOT dashboard
    const isOnAuthPage = window.location.pathname.includes('index.html') || 
                         window.location.pathname === '/' || 
                         window.location.pathname.includes('/MemoryinQR/');
    const isOnOfflinePage = window.location.pathname.includes('offline.html');
    
    if (!window.connectionState.isOnline && isOnAuthPage && !isOnOfflinePage) {
        console.log('🚨 Offline on auth page - redirecting to offline.html');
        window.location.replace('offline.html');
        throw new Error('OFFLINE_REDIRECT');
    }
    
    // 🆕 On dashboard, stay there and handle offline gracefully
    if (!window.connectionState.isOnline && !isOnAuthPage && !isOnOfflinePage) {
        console.log('📴 Offline on dashboard - staying put with offline UI');
        showOfflineDashboardUI();
        return false;
    }
    
    console.log('✅ Online - proceeding with normal operations');
    return true;
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

// 🔄 CONNECTION EVENT HANDLERS
function setupConnectionMonitoring() {
    console.log('📡 Setting up SMART connection monitoring...');
    
    window.addEventListener('online', async () => {
        console.log('📶 Online event fired - handling intelligently...');
        window.connectionState.retryCount++;
        
        // 🆕 Hide offline UI on dashboard
        hideOfflineDashboardUI();
        
        // 🆕 Process any offline queue
        if (typeof processOfflineQueue === 'function') {
            setTimeout(processOfflineQueue, 1000);
        }
        
        // 🆕 Only redirect from offline.html, never from dashboard
        if (window.location.pathname.includes('offline.html')) {
            console.log('🔄 On offline page - redirecting back to app...');
            setTimeout(() => {
                window.location.replace('index.html?recovered=' + Date.now());
            }, 2000);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('📵 Offline event fired - handling intelligently...');
        window.connectionState.isOnline = false;
        window.connectionState.lastChecked = new Date().toISOString();
        
        // 🆕 CRITICAL: Only redirect from AUTH pages, never from dashboard
        const isOnAuthPage = window.location.pathname.includes('index.html') || 
                            window.location.pathname === '/' || 
                            window.location.pathname.includes('/MemoryinQR/');
        const isOnOfflinePage = window.location.pathname.includes('offline.html');
        
        if (isOnAuthPage && !isOnOfflinePage) {
            console.log('🚨 Offline on auth page - redirecting to offline.html');
            window.location.replace('offline.html');
        } else if (!isOnAuthPage && !isOnOfflinePage) {
            console.log('📴 Offline on dashboard - showing offline UI');
            showOfflineDashboardUI();
        }
    });
    
    console.log('✅ SMART connection monitoring active');
}

// 🎯 REAL CONNECTION CHECK (like in offline.html)
async function checkRealConnection() {
    try {
       // const response = await fetch('/MemoryinQR/online.txt?ts=' + Date.now(), {
                 const response = await fetch('online.txt?ts=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-store',
            credentials: 'omit'
        });
        return response.ok;
    } catch (error) {
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
    console.log('🔐 INIT AUTH: Starting authentication initialization...');
    
    // 🆕 SMARTER OFFLINE CHECK - Don't stop initialization on dashboard
    const isOnAuthPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' || 
                        window.location.pathname.includes('/MemoryinQR/');
    
    if (isOnAuthPage && !checkOnlineStatus()) {
        console.log('⏸️ Auth initialization paused - offline detected on auth page');
        return;
    }
    
    console.log('✅ Proceeding with auth initialization...');
    
    // Firebase auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        console.log(`👤 Auth State Changed: ${user ? 'User logged in: ' + user.email : 'No user'}`);
        
        if (user) {
            console.log('✅ Firebase user authenticated, showing dashboard...');
            showDashboard();
        } else {
            console.log('🔒 No Firebase user, showing auth UI...');
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
    
// ✅ FIX: Use REAL connection check for all auth operations
const isReallyOnline = await checkRealConnection();
if (!isReallyOnline) {
    console.log('❌ Signup blocked - real connection check failed');
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
    
    // 🎯 FIX: Use REAL connection check, not just navigator.onLine
    const isReallyOnline = await checkRealConnection();
    if (!isReallyOnline) {
        console.log('❌ Signin blocked - real connection check failed');
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
        // Clear local session data
        localStorage.removeItem('lastActivePage');
        console.log('🧹 Local storage cleaned');
        
        // 🎯 OFFLINE-AWARE LOGOUT
        if (navigator.onLine) {
            console.log('🌐 Online logout - signing out from Firebase...');
            await firebase.auth().signOut();
            console.log('✅ Firebase user logged out');
            updateStatus('Logged out successfully', 'success');
        } else {
            console.log('📴 Offline logout - clearing local data only');
            console.log('✅ Local data cleared');
            updateStatus('Logged out (offline mode)', 'success');
        }
        
        // Firebase auth state listener will handle UI automatically
        console.log('✅ Logout process complete');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        updateStatus('Logout completed', 'success');
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
// INITIALIZATION - OFFLINE FORTIFIED
// ========================================

console.log('🚀 AUTH.JS: Starting initialization process...');

// 🎯 CRITICAL: Initialize connection monitoring immediately
console.log('🔧 Phase 1: Setting up connection monitoring...');
setupConnectionMonitoring();

// 🎯 Initial connection check
console.log('🔧 Phase 2: Performing initial connection check...');
checkOnlineStatus();

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    console.log('📄 DOM loading - waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM Content Loaded - initializing auth...');
        initAuth();
    });
} else {
    console.log('✅ DOM already ready - initializing auth immediately...');
    initAuth();
}

console.log('✅ Auth.js loaded successfully - offline system active');
