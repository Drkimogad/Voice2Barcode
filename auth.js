// ========================================
// AUTHENTICATION MODULE
// ========================================

const AUTH_CONFIG = {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'currentUser',
    USERS_KEY: 'registeredUsers'
};

/**
 * Initialize authentication system
 */
function initAuth() {
    console.log('🔐 Initializing authentication...');
    
    // Check if user is already authenticated
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    
    if (token) {
        // User is logged in, show dashboard
        showDashboard();
    } else {
        // User not logged in, show auth section
        showAuth();
    }
    
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
function handleSignup(e) {
    e.preventDefault();
    
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
        
        // Get existing users
        const users = getRegisteredUsers();
        
        // Check if username already exists
        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }
        
        // Create new user
        const newUser = {
            id: generateId(),
            username,
            email,
            password, // In production, this should be hashed!
            createdAt: getTimestamp()
        };
        
        // Save user
        users.push(newUser);
        localStorage.setItem(AUTH_CONFIG.USERS_KEY, JSON.stringify(users));
        
        // Clear form
        document.getElementById('signupForm').reset();
        
        // Show success and switch to signin
        updateStatus('Account created successfully! Please sign in.', 'success');
        setTimeout(() => toggleAuthView('signin'), 1500);
        
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
function handleSignin(e) {
    e.preventDefault();
    
    const errorDisplay = document.getElementById('signinError');
    errorDisplay.textContent = '';
    
    try {
        // Get form values
        const username = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;
        
        // Validation
        if (!username || !password) {
            throw new Error('All fields are required');
        }
        
        // Get registered users
        const users = getRegisteredUsers();
        
        // Find user
        const user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            throw new Error('Invalid username or password');
        }
        
        // Create session
        const token = generateToken(user);
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email
        }));
        
        // Clear form
        document.getElementById('signinForm').reset();
        
        // Show dashboard
        updateStatus('Welcome back, ' + user.username + '!', 'success');
        showDashboard();
        
        console.log('✅ User logged in:', username);
        
    } catch (error) {
        errorDisplay.textContent = error.message;
        document.getElementById('signinPassword').value = '';
        console.error('Signin error:', error);
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    try {
        // Clear session
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem(AUTH_CONFIG.USER_KEY);
        
        // Show auth section
        showAuth();
        
        updateStatus('Logged out successfully', 'success');
        console.log('✅ User logged out');
        
    } catch (error) {
        console.error('Logout error:', error);
        updateStatus('Logout failed', 'error');
    }
}

/**
 * Generate authentication token
 * @param {object} user - User object
 * @returns {string} Token
 */
function generateToken(user) {
    return btoa(JSON.stringify({
        userId: user.id,
        username: user.username,
        timestamp: Date.now()
    }));
}

/**
 * Get registered users from localStorage
 * @returns {Array} Array of user objects
 */
function getRegisteredUsers() {
    const usersJson = localStorage.getItem(AUTH_CONFIG.USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
}

/**
 * Get current logged in user
 * @returns {object|null} User object or null
 */
function getCurrentUser() {
    const userJson = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
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
