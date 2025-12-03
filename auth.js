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


async function checkRealConnection() {
    try {
        const url = "https://raw.githubusercontent.com/drkimogad/MemoryinQR/main/online.txt?ts=" + Date.now();

        console.log("🌐 Checking connection at:", url);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(timeout);

        const text = (await res.text()).trim().toLowerCase();
        const isOnline = text === 'online';

        console.log("📡 Online check result:", isOnline);
        return isOnline;

    } catch (err) {
        console.log("❌ Connection check failed:", err);
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
// 🔐 FORGOT PASSWORD FUNCTION
// ========================================
async function handleForgotPassword(email) {
    console.log('🔐 FORGOT PASSWORD: Processing for email:', email);
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        console.log('✅ Password reset email sent to:', email);
        return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
        console.error('❌ Password reset error:', error);
        return { success: false, message: error.message };
    }
}

// ========================================
// 🗑️ DELETE ACCOUNT FUNCTION (ADAPTED)
// ========================================
async function handleDeleteAccount(email, password, confirmation) {
    console.log('🗑️ DELETE ACCOUNT: Starting process for email:', email);
    
    try {
        // 1. Validate confirmation
        if (confirmation !== 'DELETE') {
            throw new Error('Confirmation text must be exactly "DELETE"');
        }
        
        // 2. Authenticate user temporarily
        console.log('🔐 Authenticating user for deletion...');
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userId = user.uid;
        
        console.log('✅ User authenticated, UID:', userId);
        
        // 3. Show loading (use your existing updateStatus or loading overlay)
        updateStatus('Deleting account and all data...', 'info');
        
        // 4. Delete Firestore data (messages collection only)
        const db = firebase.firestore();
        console.log('🗑️ Deleting user messages from Firestore...');
        
        const messagesQuery = await db.collection('messages')
            .where('createdBy', '==', userId)
            .get();
        
        const batch = db.batch();
        messagesQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        if (messagesQuery.size > 0) {
            await batch.commit();
            console.log(`✅ Deleted ${messagesQuery.size} messages from Firestore`);
        } else {
            console.log('ℹ️ No messages found to delete');
        }
        
        // 5. Delete user from Firebase Auth
        console.log('🔥 Deleting user from Firebase Auth...');
        await user.delete();
        
        // 6. Clean up temporary session
        await firebase.auth().signOut();
        
        // 7. Clear local data
        localStorage.removeItem('signedOutOffline');
        localStorage.removeItem('lastActivePage');
        
        console.log('✅ Account deletion complete');
        return { 
            success: true, 
            message: 'Account and all data permanently deleted.' 
        };
        
    } catch (error) {
        console.error('❌ Account deletion failed:', error);
        
        // Clean up temporary session on error
        try {
            await firebase.auth().signOut();
        } catch (signOutError) {
            console.log('⚠️ Sign out cleanup failed:', signOutError);
        }
        
        // Error message handling
        let errorMessage = 'Account deletion failed: ' + error.message;
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'For security, please sign in again before deleting account.';
        }
        
        return { success: false, message: errorMessage };
    }
}

// ========================================
// 🪟 MODAL MANAGEMENT FUNCTIONS
// ========================================
function showModal(modalId) {
    console.log('🪟 Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    console.log('🪟 Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
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
    if (errorDisplay) errorDisplay.textContent = '';

    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!username || !email || !password) {
        if (errorDisplay) errorDisplay.textContent = 'All fields are required';
        return;
    }
    if (username.length < 3) {
        if (errorDisplay) errorDisplay.textContent = 'Username must be at least 3 characters';
        return;
    }
    if (!isValidEmail(email)) {
        if (errorDisplay) errorDisplay.textContent = 'Please enter a valid email address';
        return;
    }
    if (password.length < 6) {
        if (errorDisplay) errorDisplay.textContent = 'Password must be at least 6 characters';
        return;
    }

    // Quick online guard: require basic navigator.onLine for signup
    if (!navigator.onLine) {
        updateStatus('Signup requires internet connection', 'error');
        console.log('❌ Cannot signup offline (navigator reports offline)');
        return;
    }

    // Try signup directly; only if network-related failure happens we can call checkRealConnection()
    try {
        console.log('🔥 Creating Firebase user...');
        await firebase.auth().createUserWithEmailAndPassword(email, password);

        document.getElementById('signupForm').reset();
        updateStatus('Account created! Please sign in.', 'success');
        setTimeout(() => toggleAuthView('signin'), 1500);
        console.log('✅ User registration complete');
    } catch (err) {
        console.warn('⚠ Signup error:', err);
        const networkError = err && /network/i.test(err.message || '') || err.code === 'auth/network-request-failed';
        if (networkError) {
            // verify real connection if signup failed due to network
            const isReallyOnline = await checkRealConnection().catch(() => false);
            if (!isReallyOnline) {
                updateStatus('Signup requires internet connection', 'error');
                return;
            }
            // If checkRealConnection returned true, we let the error flow to UI
        }
        if (errorDisplay) errorDisplay.textContent = err.message || 'Signup failed';
    }
}


/**
 * Handle user signin - updated
 */
async function handleSignin(e) {
    e.preventDefault();
    console.log('🔑 SIGNIN: Processing signin request...');

    const errorDisplay = document.getElementById('signinError');
    if (errorDisplay) errorDisplay.textContent = '';

    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;

    if (!email || !password) {
        if (errorDisplay) errorDisplay.textContent = 'All fields are required';
        return;
    }

    // Fast guard: if browser thinks it's online, try normal Firebase sign-in first.
    if (navigator.onLine) {
        console.log('🟢 navigator.onLine=true — attempting normal Firebase sign-in');
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            document.getElementById('signinForm').reset();
            updateStatus('Welcome back!', 'success');
            console.log('✅ Online signin complete');
            return;
        } catch (err) {
            console.warn('⚠ Firebase signin failed:', err);
            // If error looks like a network failure, confirm with checkRealConnection()
            const networkError = err && (err.code === 'auth/network-request-failed' || /network/i.test(err.message || ''));
            if (!networkError) {
                // Non-network auth error (bad credentials, etc.) — show it and bail.
                if (errorDisplay) errorDisplay.textContent = err.message;
                document.getElementById('signinPassword').value = '';
                return;
            }

            console.log('🔎 Firebase signin failed with network error — verifying real connection');
            // fall through to verification below
        }
    } else {
        console.log('🔴 navigator.onLine=false — treating as offline');
    }

    // At this point: either navigator reports offline OR Firebase sign-in failed with network issue.
    // Confirm with the more robust checkRealConnection() and handle offline logic.
    const isReallyOnline = await checkRealConnection().catch((err) => {
        console.warn('❌ checkRealConnection() threw:', err);
        return false;
    });
    console.log('🌐 Network check:', isReallyOnline ? 'ONLINE' : 'OFFLINE');

    // OFFLINE SIGN-IN LOGIC (Option C)
    if (!isReallyOnline) {
        if (isAuthenticated()) {
            console.log('🔐 Cached user available → allowing offline dashboard');
            updateStatus('Offline mode — using saved session', 'info');
            showDashboard();
            return;
        }

        console.log('⛔ No cached session → cannot sign in offline');
        updateStatus("You've logged out. Signing in requires internet. Redirecting...", 'error');

        setTimeout(() => {
            window.location.href = './offline.html?reason=signin';
        }, 1500);

        return;
    }

    // If we're here, checkRealConnection said we're online but Firebase signin earlier failed due to transient network error.
    // Try sign-in one more time in online-confirmed state.
    try {
        console.log('🔁 Retrying Firebase signin after confirmed online');
        await firebase.auth().signInWithEmailAndPassword(email, password);
        document.getElementById('signinForm').reset();
        updateStatus('Welcome back!', 'success');
        console.log('✅ Online signin complete (retry)');
    } catch (err) {
        console.error('❌ Firebase signin error on retry:', err);
        if (errorDisplay) errorDisplay.textContent = err.message || 'Sign-in failed';
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
           //window.location.reload();
            //return;
            showAuth();
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

    // step 2 goes here
    
    // 🔐 NEW: Forgot Password Link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔐 Forgot password link clicked');
            showModal('forgotPasswordModal');
        });
        console.log('✅ Forgot password listener added');
    }
    
    // 🗑️ NEW: Delete Account Link
    const deleteAccountLink = document.getElementById('deleteAccountLink');
    if (deleteAccountLink) {
        deleteAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🗑️ Delete account link clicked');
            showModal('deleteAccountModal');
        });
        console.log('✅ Delete account listener added');
    }
    
    // 🔐 NEW: Forgot Password Form Submit
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔐 Forgot password form submitted');
            
            const email = document.getElementById('resetEmail').value.trim();
            const errorEl = document.getElementById('forgotPasswordError');
            const successEl = document.getElementById('forgotPasswordSuccess');
            
            // Clear previous messages
            if (errorEl) errorEl.textContent = '';
            if (successEl) successEl.textContent = '';
            
            if (!email || !isValidEmail(email)) {
                if (errorEl) errorEl.textContent = 'Please enter a valid email';
                return;
            }
            
            // Call forgot password function
            const result = await handleForgotPassword(email);
            
            if (result.success) {
                if (successEl) successEl.textContent = result.message;
                // Clear form
                document.getElementById('resetEmail').value = '';
                // Auto-close modal after 3 seconds
                setTimeout(() => hideModal('forgotPasswordModal'), 3000);
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        });
        console.log('✅ Forgot password form listener added');
    }
    
    // 🗑️ NEW: Delete Account Form Submit
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🗑️ Delete account form submitted');
            
            const email = document.getElementById('deleteEmail').value.trim();
            const confirmation = document.getElementById('deleteConfirm').value.trim();
            const errorEl = document.getElementById('deleteAccountError');
            const successEl = document.getElementById('deleteAccountSuccess');
            
            // Clear previous messages
            if (errorEl) errorEl.textContent = '';
            if (successEl) successEl.textContent = '';
            
            // Validation
            if (!email || !isValidEmail(email)) {
                if (errorEl) errorEl.textContent = 'Please enter a valid email';
                return;
            }
            
            if (confirmation !== 'DELETE') {
                if (errorEl) errorEl.textContent = 'You must type "DELETE" to confirm';
                return;
            }
            
            // Get password (you might want to add a password field)
            const password = prompt('Enter your password to confirm deletion:');
            if (!password) {
                if (errorEl) errorEl.textContent = 'Password required for deletion';
                return;
            }
            
            // Call delete account function
            const result = await handleDeleteAccount(email, password, confirmation);
            
            if (result.success) {
                if (successEl) successEl.textContent = result.message;
                // Clear form
                document.getElementById('deleteEmail').value = '';
                document.getElementById('deleteConfirm').value = '';
                // Show auth UI and close modal
                showAuth();
                setTimeout(() => hideModal('deleteAccountModal'), 3000);
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        });
        console.log('✅ Delete account form listener added');
    }
    
    // NEW: Modal close buttons
    document.querySelectorAll('.close-modal, #cancelDelete').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });
    
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
