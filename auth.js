// ========================================
// 🆕 SIMPLIFIED CONNECTION UI CONTROLLER
// ========================================

/**
 * 🆕 ONLY controls UI - NEVER redirects
 */
function handleConnectionUI(isOnline) {
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
    handleConnectionUI(navigator.onLine);
    
    // Simple event listeners - ONLY for UI updates
    window.addEventListener('online', () => {
        console.log('📶 Online - Updating UI only');
        handleConnectionUI(true);
    });
    
    window.addEventListener('offline', () => {
        console.log('📵 Offline - Updating UI only');
        handleConnectionUI(false);
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
        const basePath = isGitHub ? '/MemoryinQR/' : '/';
        const url = basePath + 'online.txt?ts=' + Date.now();
        
        console.log('🌐 Checking connection at:', url);
        
        const response = await fetch(url, {
            method: 'GET',  // THE ISSUE MIGHT BE IN GET INSTEAD OF HEAD🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐🌐
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

// 2 helpers 
function getCurrentUser() {
    return firebase.auth().currentUser;
}

function isAuthenticated() {
    return !!firebase.auth().currentUser;
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
        
        // RECOVERY AFTER OFFLINE LOGOUT
    const wasOfflineLogout = localStorage.getItem('signedOutOffline');

    if (wasOfflineLogout && navigator.onLine && !user) {
        console.log('🔁 Recovering from offline logout');
        localStorage.removeItem('signedOutOffline');
        showAuth();
        return;
    }
        
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
 * Handle user signup - updated
 */
async function handleSignup(e) {
    e.preventDefault();
    console.log('📝 SIGNUP: Processing signup request...');

    const errorDisplay = document.getElementById('signupError');
    errorDisplay.textContent = '';

    const isReallyOnline = await checkRealConnection();
    if (!isReallyOnline) {
        updateStatus('Signup requires internet connection', 'error');
        console.log('❌ Cannot signup offline');
        return;
    }

    try {
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }
        if (username.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        if (!isValidEmail(email)) {
            throw new Error('Invalid email');
        }
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        console.log('🔥 Creating Firebase user...');
        await firebase.auth().createUserWithEmailAndPassword(email, password);

        document.getElementById('signupForm').reset();
        updateStatus('Account created! Please sign in.', 'success');

        setTimeout(() => toggleAuthView('signin'), 1500);
    } catch (err) {
        console.error('❌ Signup error:', err);
        errorDisplay.textContent = err.message;
    }
}


/**
 * Handle user signin - updated
 */
async function handleSignin(e) {
    e.preventDefault();
    console.log('🔑 SIGNIN: Processing signin request...');

    const errorDisplay = document.getElementById('signinError');
    errorDisplay.textContent = '';

    const isReallyOnline = await checkRealConnection();
    console.log('🌐 Network check:', isReallyOnline ? 'ONLINE' : 'OFFLINE');

    // ================================
    // OFFLINE SIGN-IN LOGIC (Option C)
    // ================================
    if (!isReallyOnline) {
        if (isAuthenticated()) {
            console.log('🔐 Cached user available → allowing offline dashboard');
            updateStatus('Offline mode — using saved session', 'info');
            showDashboard();
            return;
        }

        console.log('⛔ No cached session → cannot sign in offline');
        updateStatus(
            "You've logged out. Signing in requires internet. Redirecting...",
            'error'
        );

        setTimeout(() => {
            window.location.href = './offline.html';
        }, 1500);

        return;
    }

    // ================================
    // NORMAL ONLINE SIGN-IN
    // ================================
    try {
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;

        if (!email || !password) {
            throw new Error('All fields are required');
        }

        console.log(`🔥 Authenticating with Firebase for: ${email}`);
        await firebase.auth().signInWithEmailAndPassword(email, password);

        document.getElementById('signinForm').reset();
        updateStatus('Welcome back!', 'success');

        console.log('✅ Online signin complete');
    } catch (error) {
        console.error('❌ Firebase signin error:', error);
        errorDisplay.textContent = error.message;
        document.getElementById('signinPassword').value = '';
    }
}


/**
 * Handle user logout - updated
 */
async function handleLogout() {
    console.log('🚪 LOGOUT: Processing logout request...');

    try {
        localStorage.removeItem('lastActivePage');

        if (navigator.onLine) {
            console.log('🌐 Online logout — signing out from Firebase');
            await firebase.auth().signOut();
        } else {
            console.log('📴 Offline logout — purging cached state');

            // Mark offline logout for recovery
            localStorage.setItem('signedOutOffline', 'true');

            // Clear Firebase local cached session
            try {
                await firebase.auth().signOut(); 
            } catch (err) {
                // Ignore — Firebase cannot reach server offline
            }

            // Force SW to serve offline.html
            window.location.reload();
            return;
        }
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
