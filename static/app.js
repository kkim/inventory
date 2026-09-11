// Inventory Management System Frontend
const API_BASE = '/api';

// Application State
const state = {
    userId: localStorage.getItem('inventory_user_id') || null,
    username: localStorage.getItem('inventory_username') || null,
    
    // Selection Path
    selectedHouse: null,
    selectedRoom: null,
    selectedFurniture: null,
    selectedCompartment: null,

    // Loaded Data Lists
    houses: [],
    rooms: [],
    furniture: [],
    compartments: [],
    items: []
};

// UI Elements
const dom = {
    authContainer: document.getElementById('auth-container'),
    appWrapper: document.getElementById('app-wrapper'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    authTitle: document.getElementById('auth-title'),
    authDesc: document.getElementById('auth-desc'),
    authToggleText: document.getElementById('auth-toggle-text'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    emailGroup: document.getElementById('email-group'),
    emailInput: document.getElementById('email'),
    passwordLabel: document.getElementById('password-label'),
    forgotPasswordToggle: document.getElementById('forgot-password-toggle'),
    
    // Sidebar & Profile
    profileUsername: document.getElementById('profile-username'),
    logoutBtn: document.getElementById('logout-btn'),
    houseList: document.getElementById('house-list'),
    
    // Content Views
    breadcrumb: document.getElementById('breadcrumb-path'),
    viewTitle: document.getElementById('view-title'),
    viewActions: document.getElementById('view-actions'),
    viewContent: document.getElementById('view-content'),
    globalSearchInput: document.getElementById('global-search-input'),
    
    // Modal Dialogue
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalSaveBtn: document.getElementById('modal-save-btn'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    
    // Toast notifications
    toastContainer: document.getElementById('toast-container')
};

// Auth Mode state: 'login', 'register', or 'reset'
let authMode = 'login';

function switchAuthMode(newMode) {
    authMode = newMode;
    
    // Clear form inputs on mode switch
    dom.usernameInput.value = '';
    dom.emailInput.value = '';
    dom.passwordInput.value = '';
    
    if (authMode === 'login') {
        dom.authTitle.textContent = 'Welcome Back';
        dom.authDesc.textContent = 'Please log in to manage your inventory';
        dom.emailGroup.style.display = 'none';
        dom.emailInput.removeAttribute('required');
        dom.passwordLabel.textContent = 'Password';
        dom.passwordInput.placeholder = 'Enter password';
        dom.authToggleText.innerHTML = "Don't have an account? <span>Register here</span>";
        dom.forgotPasswordToggle.style.display = 'block';
        dom.authSubmitBtn.textContent = 'Log In';
    } else if (authMode === 'register') {
        dom.authTitle.textContent = 'Create Account';
        dom.authDesc.textContent = 'Register a new account to start tracking';
        dom.emailGroup.style.display = 'block';
        dom.emailInput.setAttribute('required', 'required');
        dom.passwordLabel.textContent = 'Password';
        dom.passwordInput.placeholder = 'Enter password';
        dom.authToggleText.innerHTML = "Already have an account? <span>Log in here</span>";
        dom.forgotPasswordToggle.style.display = 'block';
        dom.authSubmitBtn.textContent = 'Register';
    } else if (authMode === 'reset') {
        dom.authTitle.textContent = 'Reset Password';
        dom.authDesc.textContent = 'Verify your username and email to set a new password';
        dom.emailGroup.style.display = 'block';
        dom.emailInput.setAttribute('required', 'required');
        dom.passwordLabel.textContent = 'New Password';
        dom.passwordInput.placeholder = 'Enter new password';
        dom.authToggleText.innerHTML = "Remembered your password? <span>Log in here</span>";
        dom.forgotPasswordToggle.style.display = 'none';
        dom.authSubmitBtn.textContent = 'Reset Password';
    }
}

// Initialize App
function init() {
    setupEventListeners();
    updateUIForAuth();
}

// Event Listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");
    // Auth Form
    dom.loginForm.addEventListener('submit', handleAuthSubmit);
    dom.authToggleText.addEventListener('click', (e) => {
        console.log("Auth toggle clicked!");
        if (authMode === 'login') {
            switchAuthMode('register');
        } else {
            switchAuthMode('login');
        }
    });
    dom.forgotPasswordToggle.addEventListener('click', (e) => {
        console.log("Forgot password clicked!");
        switchAuthMode('reset');
    });
    dom.logoutBtn.addEventListener('click', handleLogout);
    
    // Modal Close
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalCancelBtn.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });
    
    // Global Search Input
    dom.globalSearchInput.addEventListener('input', handleGlobalSearch);
}

// Toast Notification Helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Login, Registration, or Password Reset
async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = dom.usernameInput.value.trim();
    const password = dom.passwordInput.value.trim();
    const email = dom.emailInput.value.trim();
    
    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }
    
    if ((authMode === 'register' || authMode === 'reset') && !email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    let endpoint = '';
    let bodyData = {};
    
    if (authMode === 'login') {
        endpoint = '/auth/login';
        bodyData = { username, password };
    } else if (authMode === 'register') {
        endpoint = '/auth/register';
        bodyData = { username, email, password };
    } else if (authMode === 'reset') {
        endpoint = '/auth/reset-password';
        bodyData = { username, email, new_password: password };
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Operation failed');
        }
        
        if (authMode === 'reset') {
            showToast('Password reset successful! You can now log in.');
            switchAuthMode('login');
            return;
        }
        
        // Success for Login/Register
        state.userId = data.id;
        state.username = data.username;
        localStorage.setItem('inventory_user_id', data.id);
        localStorage.setItem('inventory_username', data.username);
        
        showToast(authMode === 'login' ? `Logged in as ${data.username}` : 'Registration successful! Logged in.');
        updateUIForAuth();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function handleLogout() {
    state.userId = null;
    state.username = null;
    localStorage.removeItem('inventory_user_id');
    localStorage.removeItem('inventory_username');
    updateUIForAuth();
    showToast('Logged out successfully');
}

// Authenticated Fetch Wrapper
async function authedFetch(url, options = {}) {
    if (!state.userId) {
        handleLogout();
        return null;
    }
    
    options.headers = {
        ...options.headers,
        'X-User-ID': state.userId,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(`${API_BASE}${url}`, options);
        if (response.status === 401) {
            showToast('Session expired or unauthorized', 'error');
            handleLogout();
            return null;
        }
        return response;
    } catch (err) {
        showToast('Network error occurred', 'error');
        return null;
    }
}

// Update App View Based on Auth Status
function updateUIForAuth() {
    if (state.userId && state.username) {
        dom.authContainer.style.display = 'none';
        dom.appWrapper.style.display = 'flex';
        dom.profileUsername.textContent = state.username;
        
        // Load initial data
        loadHouses();
    } else {
        dom.authContainer.style.display = 'flex';
        dom.appWrapper.style.display = 'none';
        dom.usernameInput.value = '';
        dom.passwordInput.value = '';
    }
}

// ----------------------------------------------------
// Data Loading & Rendering Section
// ----------------------------------------------------

async function loadHouses() {
    const response = await authedFetch('/houses');
    if (response && response.ok) {
        state.houses = await response.json();
        renderHousesSidebar();
        
        // Auto-select first house if none selected
        if (state.houses.length > 0 && !state.selectedHouse) {
            selectHouse(state.houses[0]);
        } else if (state.selectedHouse) {
            // Refresh currently selected house reference
            const found = state.houses.find(h => h.id === state.selectedHouse.id);
            if (found) selectHouse(found);
            else selectEmptyState();
        } else {
            selectEmptyState();
        }
    }
}

function renderHousesSidebar() {
    dom.houseList.innerHTML = '';
    
    if (state.houses.length === 0) {
        dom.houseList.innerHTML = '<div style="padding: 10px; font-size: 0.85rem; color: var(--text-secondary);">No houses found. Create one!</div>';
        return;
    }
    
    state.houses.forEach(house => {
        const activeClass = state.selectedHouse && state.selectedHouse.id === house.id ? 'active' : '';
        const item = document.createElement('div');
        item.className = `nav-item ${activeClass}`;
        item.innerHTML = `
            <div class="nav-item-content">
                <i class="fas fa-home"></i>
                <span>${escapeHtml(house.name)}</span>
            </div>
            <div class="nav-actions">
                <i class="fas fa-plus" title="Add Room" onclick="event.stopPropagation(); showCreateRoomModalForHouse(${house.id})"></i>
                <i class="fas fa-share-alt" title="Share" onclick="event.stopPropagation(); showShareModal(${house.id}, '${house.name}')"></i>
                <i class="fas fa-edit" title="Edit" onclick="event.stopPropagation(); showEditHouseModal(${house.id}, '${house.name}', '${house.address || ''}')"></i>
                <i class="fas fa-trash delete-icon" title="Delete" onclick="event.stopPropagation(); deleteHouse(${house.id})"></i>
            </div>
        `;
        item.addEventListener('click', () => selectHouse(house));
        dom.houseList.appendChild(item);
    });
}

function selectEmptyState() {
    state.selectedHouse = null;
    state.selectedRoom = null;
    state.selectedFurniture = null;
    state.selectedCompartment = null;
    updateBreadcrumb();
    
    dom.viewTitle.textContent = 'Get Started';
    dom.viewActions.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="showCreateHouseModal()"><i class="fas fa-plus"></i> Add New House</button>`;
    
    dom.viewContent.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-laptop-house"></i>
            <h3>No House Selected</h3>
            <p>Select an existing house from the sidebar, or create a brand new one to start organizing.</p>
            <button class="btn btn-primary" style="max-width: 200px; margin-top: 1rem;" onclick="showCreateHouseModal()">Create a House</button>
        </div>
    `;
}

function selectHouse(house) {
    state.selectedHouse = house;
    state.selectedRoom = null;
    state.selectedFurniture = null;
    state.selectedCompartment = null;
    
    renderHousesSidebar();
    loadRooms();
}

async function loadRooms() {
    updateBreadcrumb();
    if (!state.selectedHouse) return;
    
    const response = await authedFetch(`/rooms?house_id=${state.selectedHouse.id}`);
    if (response && response.ok) {
        state.rooms = await response.json();
        renderRoomsGrid();
    }
}

function renderRoomsGrid() {
    dom.viewTitle.textContent = `${escapeHtml(state.selectedHouse.name)} Rooms`;
    dom.viewActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="showCreateRoomModal()"><i class="fas fa-plus"></i> Add Room</button>
    `;
    
    if (state.rooms.length === 0) {
        dom.viewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-open"></i>
                <h3>No Rooms in this House</h3>
                <p>Create rooms (e.g. Living Room, Bedroom, Garage) to begin planning your inventory mapping.</p>
                <button class="btn btn-primary" style="max-width: 180px; margin-top: 1rem;" onclick="showCreateRoomModal()">Add a Room</button>
            </div>
        `;
        return;
    }
    
    // Sort rooms alphabetically by name
    state.rooms.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = '<div class="grid-container">';
    state.rooms.forEach(room => {
        html += `
            <div class="card" onclick="selectRoom(${JSON.stringify(room).replace(/"/g, '&quot;')})">
                <div class="card-icon"><i class="fas fa-door-closed"></i></div>
                <div class="card-title">${escapeHtml(room.name)}</div>
                <div class="card-subtitle">Click to view furniture</div>
                <div class="card-actions">
                    <button onclick="event.stopPropagation(); showEditRoomModal(${room.id}, '${room.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-card-delete" onclick="event.stopPropagation(); deleteRoom(${room.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    dom.viewContent.innerHTML = html;
}

function selectRoom(room) {
    state.selectedRoom = room;
    state.selectedFurniture = null;
    state.selectedCompartment = null;
    loadFurniture();
}

async function loadFurniture() {
    updateBreadcrumb();
    if (!state.selectedRoom) return;
    
    const response = await authedFetch(`/furniture?room_id=${state.selectedRoom.id}`);
    if (response && response.ok) {
        state.furniture = await response.json();
        renderFurnitureGrid();
    }
}

function renderFurnitureGrid() {
    dom.viewTitle.textContent = `${escapeHtml(state.selectedRoom.name)} Furniture`;
    dom.viewActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="goBackToRooms()"><i class="fas fa-arrow-left"></i> Back to Rooms</button>
        <button class="btn btn-secondary btn-sm" onclick="showCreateFurnitureModal()"><i class="fas fa-plus"></i> Add Furniture</button>
    `;
    
    if (state.furniture.length === 0) {
        dom.viewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-couch"></i>
                <h3>No Furniture in this Room</h3>
                <p>Create furniture objects (e.g. Bookshelf, Cabinet, Closet) to organize your storage space.</p>
                <button class="btn btn-primary" style="max-width: 180px; margin-top: 1rem;" onclick="showCreateFurnitureModal()">Add Furniture</button>
            </div>
        `;
        return;
    }
    
    // Sort furniture alphabetically by name
    state.furniture.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = '<div class="grid-container">';
    state.furniture.forEach(furn => {
        html += `
            <div class="card" onclick="selectFurniture(${JSON.stringify(furn).replace(/"/g, '&quot;')})">
                <div class="card-icon"><i class="fas fa-couch"></i></div>
                <div class="card-title">${escapeHtml(furn.name)}</div>
                <div class="card-subtitle">Click to view compartments</div>
                <div class="card-actions">
                    <button onclick="event.stopPropagation(); showEditFurnitureModal(${furn.id}, '${furn.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-card-delete" onclick="event.stopPropagation(); deleteFurniture(${furn.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    dom.viewContent.innerHTML = html;
}

function selectFurniture(furn) {
    state.selectedFurniture = furn;
    state.selectedCompartment = null;
    loadCompartments();
}

async function loadCompartments() {
    updateBreadcrumb();
    if (!state.selectedFurniture) return;
    
    const response = await authedFetch(`/compartments?furniture_id=${state.selectedFurniture.id}`);
    if (response && response.ok) {
        state.compartments = await response.json();
        renderCompartmentsGrid();
    }
}

function renderCompartmentsGrid() {
    dom.viewTitle.textContent = `${escapeHtml(state.selectedFurniture.name)} Compartments`;
    dom.viewActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="goBackToFurniture()"><i class="fas fa-arrow-left"></i> Back to Furniture</button>
        <button class="btn btn-secondary btn-sm" onclick="showCreateCompartmentModal()"><i class="fas fa-plus"></i> Add Compartment</button>
    `;
    
    if (state.compartments.length === 0) {
        dom.viewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Compartments</h3>
                <p>Compartments are the individual drawers, shelves, or boxes inside your furniture where items sit.</p>
                <button class="btn btn-primary" style="max-width: 200px; margin-top: 1rem;" onclick="showCreateCompartmentModal()">Add Compartment</button>
            </div>
        `;
        return;
    }
    
    // Sort compartments alphabetically by name
    state.compartments.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = '<div class="grid-container">';
    state.compartments.forEach(comp => {
        html += `
            <div class="card" onclick="selectCompartment(${JSON.stringify(comp).replace(/"/g, '&quot;')})">
                <div class="card-icon"><i class="fas fa-box"></i></div>
                <div class="card-title">${escapeHtml(comp.name)}</div>
                <div class="card-subtitle">Click to view inventory items</div>
                <div class="card-actions">
                    <button onclick="event.stopPropagation(); showEditCompartmentModal(${comp.id}, '${comp.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-card-delete" onclick="event.stopPropagation(); deleteCompartment(${comp.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    dom.viewContent.innerHTML = html;
}

function selectCompartment(comp) {
    state.selectedCompartment = comp;
    loadItems();
}

async function loadItems() {
    updateBreadcrumb();
    if (!state.selectedCompartment) return;
    
    const response = await authedFetch(`/items?compartment_id=${state.selectedCompartment.id}`);
    if (response && response.ok) {
        state.items = await response.json();
        renderItemsTable();
    }
}

function renderItemsTable() {
    dom.viewTitle.textContent = `${escapeHtml(state.selectedCompartment.name)} Items`;
    dom.viewActions.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="goBackToCompartments()"><i class="fas fa-arrow-left"></i> Back to Compartments</button>
        <button class="btn btn-secondary btn-sm" onclick="showCreateItemModal()"><i class="fas fa-plus"></i> Add Item</button>
    `;
    
    if (state.items.length === 0) {
        dom.viewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>No Items in this Compartment</h3>
                <p>Create actual items and set quantities to begin tracking your inventory.</p>
                <button class="btn btn-primary" style="max-width: 180px; margin-top: 1rem;" onclick="showCreateItemModal()">Add Item</button>
            </div>
        `;
        return;
    }
    
    // Sort items alphabetically by name
    state.items.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = `
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Count / Quantity</th>
                        <th style="text-align: right; width: 150px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    state.items.forEach(item => {
        html += `
            <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><span class="count-badge">${item.count}</span></td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="changeItemCount(${item.id}, ${item.count}, 1)"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="changeItemCount(${item.id}, ${item.count}, -1)"><i class="fas fa-minus"></i></button>
                        <button class="btn btn-secondary btn-sm" style="padding: 4px 8px;" onclick="showEditItemModal(${item.id}, '${item.name}', ${item.count})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    dom.viewContent.innerHTML = html;
}

// ----------------------------------------------------
// UI Navigation Helpers (Breadcrumbs)
// ----------------------------------------------------

function goBackToRooms() {
    state.selectedRoom = null;
    state.selectedFurniture = null;
    state.selectedCompartment = null;
    loadRooms();
}

function goBackToFurniture() {
    state.selectedFurniture = null;
    state.selectedCompartment = null;
    loadFurniture();
}

function goBackToCompartments() {
    state.selectedCompartment = null;
    loadCompartments();
}

// ----------------------------------------------------
// Global Search & Navigation
// ----------------------------------------------------
let searchTimeout = null;

function handleGlobalSearch(e) {
    const query = e.target.value.trim();
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (!query || query.length < 1) {
        // Reset view to original state
        if (state.selectedCompartment) {
            loadItems();
        } else if (state.selectedFurniture) {
            loadCompartments();
        } else if (state.selectedRoom) {
            loadFurniture();
        } else if (state.selectedHouse) {
            loadRooms();
        } else {
            loadHouses();
        }
        return;
    }
    
    // Debounce search requests to avoid spamming the database
    searchTimeout = setTimeout(() => {
        performGlobalSearch(query);
    }, 250);
}

async function performGlobalSearch(query) {
    const response = await authedFetch(`/items/search?q=${encodeURIComponent(query)}`);
    if (response && response.ok) {
        const results = await response.json();
        renderSearchResults(results, query);
    }
}

function renderSearchResults(results, query) {
    dom.viewTitle.textContent = `Search Results for "${escapeHtml(query)}"`;
    dom.viewActions.innerHTML = ''; // No actions for search view
    
    // Create custom breadcrumb for search
    dom.breadcrumb.innerHTML = '<span>Search Results</span>';
    
    if (results.length === 0) {
        dom.viewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Items Found</h3>
                <p>We couldn't find any items matching "${escapeHtml(query)}" in your inventory.</p>
            </div>
        `;
        return;
    }
    
    // Sort search results alphabetically by name
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    let html = `
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
            Found <strong>${results.length}</strong> items. Click on any item's path to instantly navigate to its location.
        </p>
        <div class="table-responsive">
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Location Path</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach(item => {
        const pathString = `${escapeHtml(item.house_name)} &gt; ${escapeHtml(item.room_name)} &gt; ${escapeHtml(item.furniture_name)} &gt; ${escapeHtml(item.compartment_name)}`;
        html += `
            <tr style="cursor: pointer;" onclick="navigateToItemLocation(${item.house_id}, ${item.room_id}, ${item.furniture_id}, ${item.compartment_id})">
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><span class="count-badge">${item.count}</span></td>
                <td>
                    <span style="font-size: 0.85rem; color: var(--accent-color); font-weight: 500;">
                        <i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i> ${pathString}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    dom.viewContent.innerHTML = html;
}

async function navigateToItemLocation(houseId, roomId, furnitureId, compartmentId) {
    const house = state.houses.find(h => h.id === houseId);
    if (!house) {
        showToast('House not found or accessible', 'error');
        return;
    }
    
    // 1. Select the house
    state.selectedHouse = house;
    renderHousesSidebar();
    
    // 2. Fetch rooms
    const roomsResponse = await authedFetch(`/rooms?house_id=${houseId}`);
    if (roomsResponse && roomsResponse.ok) {
        state.rooms = await roomsResponse.json();
        const room = state.rooms.find(r => r.id === roomId);
        if (room) {
            state.selectedRoom = room;
            
            // 3. Fetch furniture
            const furnResponse = await authedFetch(`/furniture?room_id=${roomId}`);
            if (furnResponse && furnResponse.ok) {
                state.furniture = await furnResponse.json();
                const furn = state.furniture.find(f => f.id === furnitureId);
                if (furn) {
                    state.selectedFurniture = furn;
                    
                    // 4. Fetch compartments
                    const compResponse = await authedFetch(`/compartments?furniture_id=${furnitureId}`);
                    if (compResponse && compResponse.ok) {
                        state.compartments = await compResponse.json();
                        const comp = state.compartments.find(c => c.id === compartmentId);
                        if (comp) {
                            state.selectedCompartment = comp;
                            
                            // Reset search input value
                            dom.globalSearchInput.value = '';
                            
                            // 5. Load items
                            loadItems();
                            showToast(`Navigated to: ${house.name} > ${room.name} > ${furn.name} > ${comp.name}`);
                        }
                    }
                }
            }
        }
    }
}

function updateBreadcrumb() {
    let breadcrumbs = [];
    
    if (state.selectedHouse) {
        breadcrumbs.push(`<span style="cursor:pointer;" onclick="selectHouse(${JSON.stringify(state.selectedHouse).replace(/"/g, '&quot;')})">${escapeHtml(state.selectedHouse.name)}</span>`);
    }
    if (state.selectedRoom) {
        breadcrumbs.push(`<span style="cursor:pointer;" onclick="selectRoom(${JSON.stringify(state.selectedRoom).replace(/"/g, '&quot;')})">${escapeHtml(state.selectedRoom.name)}</span>`);
    }
    if (state.selectedFurniture) {
        breadcrumbs.push(`<span style="cursor:pointer;" onclick="selectFurniture(${JSON.stringify(state.selectedFurniture).replace(/"/g, '&quot;')})">${escapeHtml(state.selectedFurniture.name)}</span>`);
    }
    if (state.selectedCompartment) {
        breadcrumbs.push(`<span>${escapeHtml(state.selectedCompartment.name)}</span>`);
    }
    
    if (breadcrumbs.length === 0) {
        dom.breadcrumb.innerHTML = '<span>Inventory App</span>';
    } else {
        dom.breadcrumb.innerHTML = breadcrumbs.join(' <i class="fas fa-chevron-right" style="font-size: 0.75rem; color: var(--text-secondary);"></i> ');
    }
}

// Escapes dynamic HTML to prevent injection
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// Modals and Forms Orchestration
// ----------------------------------------------------

function showModal(title, bodyHtml, saveCallback) {
    dom.modalTitle.textContent = title;
    dom.modalBody.innerHTML = bodyHtml;
    dom.modalOverlay.style.display = 'flex';
    
    // Unbind and rebind submit action
    const newSaveBtn = dom.modalSaveBtn.cloneNode(true);
    dom.modalSaveBtn.parentNode.replaceChild(newSaveBtn, dom.modalSaveBtn);
    dom.modalSaveBtn = newSaveBtn;
    
    dom.modalSaveBtn.addEventListener('click', async () => {
        const success = await saveCallback();
        if (success !== false) closeModal();
    });
}

function closeModal() {
    dom.modalOverlay.style.display = 'none';
}

// 1. House Actions
function showCreateHouseModal() {
    const html = `
        <div class="form-group">
            <label for="modal-house-name">House Name</label>
            <input type="text" id="modal-house-name" class="form-control" placeholder="e.g. My Villa, Office" required>
        </div>
        <div class="form-group">
            <label for="modal-house-address">Address</label>
            <input type="text" id="modal-house-address" class="form-control" placeholder="e.g. 123 Luxury Ave">
        </div>
    `;
    
    showModal('Add New House', html, async () => {
        const name = document.getElementById('modal-house-name').value.trim();
        const address = document.getElementById('modal-house-address').value.trim();
        
        if (!name) {
            showToast('House name is required', 'error');
            return false;
        }
        
        const response = await authedFetch('/houses', {
            method: 'POST',
            body: JSON.stringify({ name, address })
        });
        
        if (response && response.ok) {
            showToast('House created successfully!');
            loadHouses();
            return true;
        }
        return false;
    });
}

function showEditHouseModal(id, currentName, currentAddress) {
    const html = `
        <div class="form-group">
            <label for="modal-house-name">House Name</label>
            <input type="text" id="modal-house-name" class="form-control" value="${escapeHtml(currentName)}" required>
        </div>
        <div class="form-group">
            <label for="modal-house-address">Address</label>
            <input type="text" id="modal-house-address" class="form-control" value="${escapeHtml(currentAddress)}">
        </div>
    `;
    
    showModal('Edit House', html, async () => {
        const name = document.getElementById('modal-house-name').value.trim();
        const address = document.getElementById('modal-house-address').value.trim();
        
        if (!name) {
            showToast('House name is required', 'error');
            return false;
        }
        
        const response = await authedFetch(`/houses/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, address })
        });
        
        if (response && response.ok) {
            showToast('House updated!');
            loadHouses();
            return true;
        }
        return false;
    });
}

async function deleteHouse(id) {
    if (!confirm('Are you sure you want to delete this house? This will delete all rooms and items in it!')) return;
    
    const response = await authedFetch(`/houses/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('House deleted successfully');
        loadHouses();
    }
}

// Share House Modal
function showShareModal(id, houseName) {
    const html = `
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Share "<strong>${escapeHtml(houseName)}</strong>" with another user of the inventory application. They will be able to view and manage all items inside.
        </p>
        <div class="form-group">
            <label for="modal-share-username">Username to Share With</label>
            <input type="text" id="modal-share-username" class="form-control" placeholder="Enter registration username" required>
        </div>
    `;
    
    showModal('Share House', html, async () => {
        const username = document.getElementById('modal-share-username').value.trim();
        if (!username) {
            showToast('Username is required', 'error');
            return false;
        }
        
        const response = await authedFetch(`/houses/${id}/share?target_username=${encodeURIComponent(username)}`, {
            method: 'POST'
        });
        
        if (response && response.ok) {
            const data = await response.json();
            showToast(data.message || 'Shared successfully!');
            return true;
        } else {
            const data = await response.json();
            showToast(data.detail || 'Could not share house', 'error');
            return false;
        }
    });
}

// 2. Room Actions
function showCreateRoomModal() {
    if (!state.selectedHouse) {
        showToast('Please select a house first', 'error');
        return;
    }
    showCreateRoomModalForHouse(state.selectedHouse.id);
}

function showCreateRoomModalForHouse(houseId) {
    const html = `
        <div class="form-group">
            <label for="modal-room-name">Room Name</label>
            <input type="text" id="modal-room-name" class="form-control" placeholder="e.g. Master Bedroom, Garage" required>
        </div>
    `;
    
    showModal('Add Room', html, async () => {
        const name = document.getElementById('modal-room-name').value.trim();
        if (!name) {
            showToast('Room name is required', 'error');
            return false;
        }
        
        const response = await authedFetch('/rooms', {
            method: 'POST',
            body: JSON.stringify({ name, house_id: houseId })
        });
        
        if (response && response.ok) {
            showToast('Room added successfully!');
            // If currently viewing the target house, reload rooms view
            if (state.selectedHouse && state.selectedHouse.id === houseId) {
                // Return to house/rooms root view
                state.selectedRoom = null;
                state.selectedFurniture = null;
                state.selectedCompartment = null;
                loadRooms();
            } else {
                loadHouses();
            }
            return true;
        }
        return false;
    });
}

function showEditRoomModal(id, currentName) {
    const html = `
        <div class="form-group">
            <label for="modal-room-name">Room Name</label>
            <input type="text" id="modal-room-name" class="form-control" value="${escapeHtml(currentName)}" required>
        </div>
    `;
    
    showModal('Edit Room', html, async () => {
        const name = document.getElementById('modal-room-name').value.trim();
        if (!name) {
            showToast('Room name is required', 'error');
            return false;
        }
        
        const response = await authedFetch(`/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, house_id: state.selectedHouse.id })
        });
        
        if (response && response.ok) {
            showToast('Room updated!');
            loadRooms();
            return true;
        }
        return false;
    });
}

async function deleteRoom(id) {
    if (!confirm('Delete this room and all of its furniture/items?')) return;
    
    const response = await authedFetch(`/rooms/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Room deleted');
        loadRooms();
    }
}

// 3. Furniture Actions
function showCreateFurnitureModal() {
    const html = `
        <div class="form-group">
            <label for="modal-furniture-name">Furniture Name</label>
            <input type="text" id="modal-furniture-name" class="form-control" placeholder="e.g. Wardrobe, Kitchen Sink" required>
        </div>
    `;
    
    showModal('Add Furniture', html, async () => {
        const name = document.getElementById('modal-furniture-name').value.trim();
        if (!name) {
            showToast('Furniture name is required', 'error');
            return false;
        }
        
        const response = await authedFetch('/furniture', {
            method: 'POST',
            body: JSON.stringify({ name, room_id: state.selectedRoom.id })
        });
        
        if (response && response.ok) {
            showToast('Furniture added!');
            loadFurniture();
            return true;
        }
        return false;
    });
}

function showEditFurnitureModal(id, currentName) {
    const html = `
        <div class="form-group">
            <label for="modal-furniture-name">Furniture Name</label>
            <input type="text" id="modal-furniture-name" class="form-control" value="${escapeHtml(currentName)}" required>
        </div>
    `;
    
    showModal('Edit Furniture', html, async () => {
        const name = document.getElementById('modal-furniture-name').value.trim();
        if (!name) {
            showToast('Furniture name is required', 'error');
            return false;
        }
        
        const response = await authedFetch(`/furniture/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, room_id: state.selectedRoom.id })
        });
        
        if (response && response.ok) {
            showToast('Furniture updated!');
            loadFurniture();
            return true;
        }
        return false;
    });
}

async function deleteFurniture(id) {
    if (!confirm('Delete this furniture and all its compartments/items?')) return;
    
    const response = await authedFetch(`/furniture/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Furniture deleted');
        loadFurniture();
    }
}

// 4. Compartment Actions
function showCreateCompartmentModal() {
    const html = `
        <div class="form-group">
            <label for="modal-comp-name">Compartment Name</label>
            <input type="text" id="modal-comp-name" class="form-control" placeholder="e.g. Top Drawer, Shelf A" required>
        </div>
    `;
    
    showModal('Add Compartment', html, async () => {
        const name = document.getElementById('modal-comp-name').value.trim();
        if (!name) {
            showToast('Compartment name is required', 'error');
            return false;
        }
        
        const response = await authedFetch('/compartments', {
            method: 'POST',
            body: JSON.stringify({ name, furniture_id: state.selectedFurniture.id })
        });
        
        if (response && response.ok) {
            showToast('Compartment added!');
            loadCompartments();
            return true;
        }
        return false;
    });
}

function showEditCompartmentModal(id, currentName) {
    const html = `
        <div class="form-group">
            <label for="modal-comp-name">Compartment Name</label>
            <input type="text" id="modal-comp-name" class="form-control" value="${escapeHtml(currentName)}" required>
        </div>
    `;
    
    showModal('Edit Compartment', html, async () => {
        const name = document.getElementById('modal-comp-name').value.trim();
        if (!name) {
            showToast('Compartment name is required', 'error');
            return false;
        }
        
        const response = await authedFetch(`/compartments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, furniture_id: state.selectedFurniture.id })
        });
        
        if (response && response.ok) {
            showToast('Compartment updated!');
            loadCompartments();
            return true;
        }
        return false;
    });
}

async function deleteCompartment(id) {
    if (!confirm('Delete this compartment and all its items?')) return;
    
    const response = await authedFetch(`/compartments/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Compartment deleted');
        loadCompartments();
    }
}

// 5. Item Actions
function showCreateItemModal() {
    const html = `
        <div class="form-group">
            <label for="modal-item-name">Item Name</label>
            <input type="text" id="modal-item-name" class="form-control" placeholder="e.g. Hammer, Batteries" required>
        </div>
        <div class="form-group">
            <label for="modal-item-count">Quantity / Count</label>
            <input type="number" id="modal-item-count" class="form-control" value="1" min="0" required>
        </div>
    `;
    
    showModal('Add Item', html, async () => {
        const name = document.getElementById('modal-item-name').value.trim();
        const countVal = parseInt(document.getElementById('modal-item-count').value);
        
        if (!name) {
            showToast('Item name is required', 'error');
            return false;
        }
        if (isNaN(countVal) || countVal < 0) {
            showToast('Quantity must be a positive number', 'error');
            return false;
        }
        
        const response = await authedFetch('/items', {
            method: 'POST',
            body: JSON.stringify({ name, count: countVal, compartment_id: state.selectedCompartment.id })
        });
        
        if (response && response.ok) {
            showToast('Item added!');
            loadItems();
            return true;
        }
        return false;
    });
}

function showEditItemModal(id, currentName, currentCount) {
    const html = `
        <div class="form-group">
            <label for="modal-item-name">Item Name</label>
            <input type="text" id="modal-item-name" class="form-control" value="${escapeHtml(currentName)}" required>
        </div>
        <div class="form-group">
            <label for="modal-item-count">Quantity / Count</label>
            <input type="number" id="modal-item-count" class="form-control" value="${currentCount}" min="0" required>
        </div>
    `;
    
    showModal('Edit Item', html, async () => {
        const name = document.getElementById('modal-item-name').value.trim();
        const countVal = parseInt(document.getElementById('modal-item-count').value);
        
        if (!name) {
            showToast('Item name is required', 'error');
            return false;
        }
        if (isNaN(countVal) || countVal < 0) {
            showToast('Quantity must be a positive number', 'error');
            return false;
        }
        
        const response = await authedFetch(`/items/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, count: countVal, compartment_id: state.selectedCompartment.id })
        });
        
        if (response && response.ok) {
            showToast('Item updated!');
            loadItems();
            return true;
        }
        return false;
    });
}

async function changeItemCount(id, currentCount, delta) {
    const newCount = currentCount + delta;
    if (newCount < 0) {
        showToast('Quantity cannot be negative', 'error');
        return;
    }
    
    const response = await authedFetch(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ count: newCount })
    });
    
    if (response && response.ok) {
        loadItems();
    }
}

async function deleteItem(id) {
    if (!confirm('Delete this item from inventory?')) return;
    
    const response = await authedFetch(`/items/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Item deleted');
        loadItems();
    }
}

// Safe, bulletproof initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded fired.");
        init();
    });
} else {
    console.log("DOM already ready, running init directly.");
    init();
}
