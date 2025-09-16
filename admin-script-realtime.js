// Firebase Configuration (Realtime Database Version)
const firebaseConfig = {
  apiKey: "AIzaSyATW5HErUw05Ij28L6974sR12lVO8Av_ew",
  authDomain: "sgsa-kids.firebaseapp.com",
  databaseURL: "https://sgsa-kids-default-rtdb.firebaseio.com",
  projectId: "sgsa-kids",
  storageBucket: "sgsa-kids.firebasestorage.app",
  messagingSenderId: "988633336020",
  appId: "1:988633336020:web:f9f2055d4dd7996ad51341",
  measurementId: "G-X98HHTS026"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let currentUser = null;
let scouts = [];
let attendanceData = {};
let currentDate = new Date();

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Ensure all modals are hidden by default
    hideAllModals();
    
    initializeApp();
    setupEventListeners();
    setDefaultDate();
});

// Function to hide all modals
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.id !== 'loginModal') {
            modal.style.display = 'none';
        }
    });
}

// Initialize authentication state
function initializeApp() {
    console.log('Initializing authentication...');
    
    // Always show login modal first
    showLoginModal();
    
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
            // User is signed in, but verify they have permission to access admin
            console.log('User authenticated:', user.email);
            console.log('User email verified:', user.emailVerified);
            
            try {
                showLoadingSpinner();
                console.log('Testing database access...');
                
                // Test database access by trying to read scouts
                const scoutsRef = database.ref('scouts');
                const snapshot = await scoutsRef.limitToFirst(1).once('value');
                console.log('Database access verified');
                
                currentUser = user;
                hideLoadingSpinner();
                showDashboard();
                loadDashboardData();
                updateAdminInfo();
                showNotification('Welcome back, ' + user.email, 'success');
                
            } catch (error) {
                console.error('Database access error details:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                hideLoadingSpinner();
                
                // Check specific error types
                if (error.code === 'PERMISSION_DENIED') {
                    await auth.signOut();
                    showLoginModal();
                    showNotification('Access denied. Your email (' + user.email + ') is not authorized for admin access.', 'error');
                } else {
                    showNotification('Database connection error: ' + error.message, 'error');
                }
            }
        } else {
            // No user signed in
            currentUser = null;
            hideLoadingSpinner();
            showLoginModal();
        }
    });
    
    // Also check for any existing authentication immediately
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
        console.log('Found existing auth user:', currentAuthUser.email);
        showLoadingSpinner();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
            updateActiveMenuItem(item);
        });
    });
    
    // Add scout form
    const addScoutForm = document.getElementById('addScoutForm');
    if (addScoutForm) {
        addScoutForm.addEventListener('submit', handleAddScout);
    }

    // Add announcement forms
    const addAnnouncementForm = document.getElementById('addAnnouncementForm');
    if (addAnnouncementForm) {
        addAnnouncementForm.addEventListener('submit', handleAddAnnouncement);
    }

    const editAnnouncementForm = document.getElementById('editAnnouncementForm');
    if (editAnnouncementForm) {
        editAnnouncementForm.addEventListener('submit', handleEditAnnouncement);
    }

    // Announcement preview functionality
    setupAnnouncementPreview('addAnnouncementForm', 'announcementPreview');
    setupAnnouncementPreview('editAnnouncementForm', 'editAnnouncementPreview');

    // Curriculum form
    const editCurriculumForm = document.getElementById('editCurriculumForm');
    if (editCurriculumForm) {
        editCurriculumForm.addEventListener('submit', handleEditCurriculum);
    }

    // Program year selector
    const programYearSelect = document.getElementById('programYearSelect');
    if (programYearSelect) {
        programYearSelect.addEventListener('change', loadSelectedYear);
    }

    // Grid search and filter
    const gridSearchInput = document.getElementById('gridSearchInput');
    if (gridSearchInput) {
        gridSearchInput.addEventListener('input', filterGridWeeks);
    }

    const monthFilterSelect = document.getElementById('monthFilterSelect');
    if (monthFilterSelect) {
        monthFilterSelect.addEventListener('change', filterGridWeeks);
    }

    // Search functionality
    const scoutSearch = document.getElementById('scoutSearch');
    if (scoutSearch) {
        scoutSearch.addEventListener('input', filterScouts);
    }
    
    // Date picker for attendance
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.addEventListener('change', loadAttendance);
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt...');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // Clear any previous errors
    errorDiv.style.display = 'none';
    showLoadingSpinner();
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        hideLoadingSpinner();
        showNotification('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        hideLoadingSpinner();
        errorDiv.textContent = getErrorMessage(error.code);
        errorDiv.style.display = 'block';
    }
}

async function logout() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        showNotification('Error logging out', 'error');
        console.error('Logout error:', error);
    }
}

// UI Functions
function showLoginModal() {
    console.log('Showing login modal...');
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    console.log('Showing dashboard...');
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Welcome to SGSA Scouts Admin Portal' },
        scouts: { title: 'Scout Roster', subtitle: 'Manage scout enrollment and information' },
        attendance: { title: 'Attendance Tracking', subtitle: 'Weekly attendance management' },
        announcements: { title: 'Announcements', subtitle: 'Manage announcements displayed on the main website' },
        curriculum: { title: 'Curriculum Management', subtitle: 'Manage weekly curriculum content and activities' },
        reports: { title: 'Reports & Analytics', subtitle: 'Generate and export attendance reports' },
        settings: { title: 'Admin Settings', subtitle: 'Manage admin preferences and system settings' }
    };
    
    const titleInfo = titles[sectionName] || { title: 'Dashboard', subtitle: 'Welcome to SGSA Scouts Admin Portal' };
    document.getElementById('pageTitle').textContent = titleInfo.title;
    document.getElementById('pageSubtitle').textContent = titleInfo.subtitle;
    
    // Load section-specific data
    switch(sectionName) {
        case 'scouts':
            loadScouts();
            break;
        case 'attendance':
            loadAttendance();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'curriculum':
            loadCurriculum();
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function updateActiveMenuItem(activeItem) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function updateAdminInfo() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.email;
    }
}

// Scout Management Functions (Realtime Database)
async function loadScouts() {
    showLoadingSpinner();
    
    try {
        console.log('Loading scouts from Realtime Database...');
        const scoutsRef = database.ref('scouts');
        const snapshot = await scoutsRef.once('value');
        
        scouts = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                scouts.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort scouts by last name, then first name
            scouts.sort((a, b) => {
                const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
                if (lastNameCompare !== 0) return lastNameCompare;
                return (a.firstName || '').localeCompare(b.firstName || '');
            });
        }
        
        console.log('Scouts loaded, count:', scouts.length);
        displayScouts(scouts);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading scouts details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            showNotification('Permission denied. Check your admin access rights.', 'error');
        } else {
            showNotification('Error loading scouts: ' + error.message, 'error');
        }
    }
}

function displayScouts(scoutsToShow) {
    const scoutsGrid = document.getElementById('scoutsGrid');
    
    if (scoutsToShow.length === 0) {
        scoutsGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No scouts found</h3>
                <p>Add your first scout to get started!</p>
            </div>
        `;
        return;
    }
    
    scoutsGrid.innerHTML = scoutsToShow.map(scout => `
        <div class="scout-card" data-scout-id="${scout.id}">
            <div class="scout-header">
                <div>
                    <div class="scout-name">${scout.firstName} ${scout.lastName}</div>
                    <div class="scout-grade">Grade ${scout.grade}</div>
                </div>
                <div class="scout-actions">
                    <button class="scout-btn edit" onclick="editScout('${scout.id}')" title="Edit Scout">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="scout-btn delete" onclick="deleteScout('${scout.id}')" title="Delete Scout">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="scout-info">
                <div><strong>Parent:</strong> ${scout.parentName || 'Not provided'}</div>
                <div><strong>Phone:</strong> ${scout.parentPhone || 'Not provided'}</div>
                <div><strong>Email:</strong> ${scout.parentEmail || 'Not provided'}</div>
                ${scout.birthDate ? `<div><strong>Age:</strong> ${calculateAge(scout.birthDate)} years</div>` : ''}
                ${scout.notes ? `<div><strong>Notes:</strong> ${scout.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function filterScouts() {
    const searchTerm = document.getElementById('scoutSearch').value.toLowerCase();
    const filteredScouts = scouts.filter(scout => 
        scout.firstName.toLowerCase().includes(searchTerm) ||
        scout.lastName.toLowerCase().includes(searchTerm) ||
        scout.grade.toString().includes(searchTerm) ||
        (scout.parentName && scout.parentName.toLowerCase().includes(searchTerm))
    );
    displayScouts(filteredScouts);
}

async function handleAddScout(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scoutData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        grade: parseInt(formData.get('grade')),
        birthDate: formData.get('birthDate') || null,
        parentName: formData.get('parentName'),
        parentEmail: formData.get('parentEmail') || null,
        parentPhone: formData.get('parentPhone'),
        emergencyContact: formData.get('emergencyContact') || null,
        notes: formData.get('notes') || null,
        dateAdded: new Date().toISOString(),
        active: true
    };
    
    showLoadingSpinner();
    
    try {
        const scoutsRef = database.ref('scouts');
        await scoutsRef.push(scoutData);
        
        hideLoadingSpinner();
        closeModal('addScoutModal');
        showNotification('Scout added successfully!', 'success');
        loadScouts();
        loadDashboardData();
        e.target.reset();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error adding scout', 'error');
        console.error('Error adding scout:', error);
    }
}

async function deleteScout(scoutId) {
    if (!confirm('Are you sure you want to delete this scout? This action cannot be undone.')) {
        return;
    }
    
    showLoadingSpinner();
    
    try {
        await database.ref('scouts/' + scoutId).remove();
        hideLoadingSpinner();
        showNotification('Scout deleted successfully', 'success');
        loadScouts();
        loadDashboardData();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error deleting scout', 'error');
        console.error('Error deleting scout:', error);
    }
}

// Attendance Functions (Realtime Database)
function setDefaultDate() {
    const today = new Date();
    // Set to most recent Tuesday (or today if it's Tuesday)
    const dayOfWeek = today.getDay();
    const tuesday = new Date(today);
    
    if (dayOfWeek === 2) {
        // Today is Tuesday
        tuesday.setDate(today.getDate());
    } else if (dayOfWeek > 2) {
        // Past Tuesday this week
        tuesday.setDate(today.getDate() - (dayOfWeek - 2));
    } else {
        // Tuesday is next week (if today is Sunday or Monday)
        tuesday.setDate(today.getDate() - (dayOfWeek + 5));
    }
    
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = tuesday.toISOString().split('T')[0];
    }
}

async function loadAttendance() {
    const dateInput = document.getElementById('attendanceDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        // Load scouts if not already loaded
        if (scouts.length === 0) {
            await loadScouts();
        }
        
        // Load attendance for this date
        const attendanceRef = database.ref('attendance/' + selectedDate.replace(/-/g, '_'));
        const snapshot = await attendanceRef.once('value');
        
        attendanceData = {};
        if (snapshot.exists()) {
            attendanceData = snapshot.val() || {};
        }
        
        displayAttendanceSheet(selectedDate);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error loading attendance', 'error');
        console.error('Error loading attendance:', error);
    }
}

function displayAttendanceSheet(date) {
    const attendanceSheet = document.getElementById('attendanceSheet');
    
    if (scouts.length === 0) {
        attendanceSheet.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-clipboard-check" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No scouts enrolled</h3>
                <p>Add scouts to the roster first!</p>
            </div>
        `;
        return;
    }
    
    attendanceSheet.innerHTML = `
        <div class="attendance-header">
            <div>Scout Name</div>
            <div>Present</div>
            <div>Absent</div>
        </div>
        ${scouts.map(scout => {
            const attendance = attendanceData[scout.id];
            const isPresent = attendance?.status === 'present';
            const isAbsent = attendance?.status === 'absent';
            
            return `
                <div class="attendance-row" data-scout-id="${scout.id}">
                    <div class="scout-attendance-name">${scout.firstName} ${scout.lastName}</div>
                    <div class="attendance-toggle">
                        <div class="attendance-radio">
                            <input type="radio" id="present_${scout.id}" name="attendance_${scout.id}" value="present" ${isPresent ? 'checked' : ''}>
                            <label for="present_${scout.id}">
                                <i class="fas fa-check-circle"></i>
                                Present
                            </label>
                        </div>
                    </div>
                    <div class="attendance-toggle">
                        <div class="attendance-radio absent">
                            <input type="radio" id="absent_${scout.id}" name="attendance_${scout.id}" value="absent" ${isAbsent ? 'checked' : ''}>
                            <label for="absent_${scout.id}">
                                <i class="fas fa-times-circle"></i>
                                Absent
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

async function saveAttendance() {
    const dateInput = document.getElementById('attendanceDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        const attendanceRows = document.querySelectorAll('.attendance-row');
        const attendanceRecord = {};
        
        for (const row of attendanceRows) {
            const scoutId = row.dataset.scoutId;
            const radio = row.querySelector('input[type="radio"]:checked');
            
            if (radio) {
                attendanceRecord[scoutId] = {
                    status: radio.value,
                    timestamp: new Date().toISOString(),
                    recordedBy: currentUser.email
                };
            }
        }
        
        // Save to date-specific node
        const dateKey = selectedDate.replace(/-/g, '_');
        await database.ref('attendance/' + dateKey).set(attendanceRecord);
        
        hideLoadingSpinner();
        showNotification('Attendance saved successfully!', 'success');
        loadDashboardData();
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error saving attendance', 'error');
        console.error('Error saving attendance:', error);
    }
}

function markAllPresent() {
    const presentRadios = document.querySelectorAll('input[value="present"]');
    presentRadios.forEach(radio => {
        radio.checked = true;
    });
    showNotification('All scouts marked present', 'success');
}

// Dashboard Functions (Realtime Database)
async function loadDashboardData() {
    try {
        // Load scouts count
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const totalScouts = scoutsSnapshot.exists() ? Object.keys(scoutsSnapshot.val()).length : 0;
        document.getElementById('totalScouts').textContent = totalScouts;
        
        // Load today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayKey = today.replace(/-/g, '_');
        const attendanceSnapshot = await database.ref('attendance/' + todayKey).once('value');
        
        let presentToday = 0;
        if (attendanceSnapshot.exists()) {
            const todayAttendance = attendanceSnapshot.val();
            presentToday = Object.values(todayAttendance).filter(record => record.status === 'present').length;
        }
        document.getElementById('presentToday').textContent = presentToday;
        
        // Calculate attendance rate
        const attendanceRate = totalScouts > 0 ? Math.round((presentToday / totalScouts) * 100) : 0;
        document.getElementById('attendanceRate').textContent = attendanceRate + '%';
        
        // Calculate weeks so far (from September)
        const programStart = new Date(new Date().getFullYear(), 8, 1); // September 1st
        const now = new Date();
        const weeksSoFar = Math.floor((now - programStart) / (7 * 24 * 60 * 60 * 1000));
        document.getElementById('weeksSoFar').textContent = Math.max(0, weeksSoFar);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Report Functions
function loadReportsData() {
    console.log('Loading reports data...');
}

async function generateMonthlyReport() {
    showLoadingSpinner();
    
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const attendanceRef = database.ref('attendance');
        const snapshot = await attendanceRef.once('value');
        
        const monthlyData = [];
        if (snapshot.exists()) {
            const allAttendance = snapshot.val();
            
            // Filter for current month
            Object.keys(allAttendance).forEach(dateKey => {
                const date = dateKey.replace(/_/g, '-');
                if (date.startsWith(currentMonth)) {
                    const dayData = allAttendance[dateKey];
                    Object.keys(dayData).forEach(scoutId => {
                        monthlyData.push({
                            date: date,
                            scoutId: scoutId,
                            ...dayData[scoutId]
                        });
                    });
                }
            });
        }
        
        // Generate CSV content
        const csvContent = generateAttendanceCSV(monthlyData);
        downloadCSV(csvContent, `attendance-report-${currentMonth}.csv`);
        
        hideLoadingSpinner();
        showNotification('Monthly report generated!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error generating report', 'error');
        console.error('Error generating report:', error);
    }
}

async function exportScoutList() {
    showLoadingSpinner();
    
    try {
        const scoutsSnapshot = await database.ref('scouts').once('value');
        const scoutsData = [];
        
        if (scoutsSnapshot.exists()) {
            scoutsSnapshot.forEach(childSnapshot => {
                scoutsData.push(childSnapshot.val());
            });
        }
        
        const csvContent = generateScoutsCSV(scoutsData);
        downloadCSV(csvContent, `scout-roster-${new Date().toISOString().split('T')[0]}.csv`);
        
        hideLoadingSpinner();
        showNotification('Scout list exported!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error exporting scout list', 'error');
        console.error('Error exporting scout list:', error);
    }
}

async function exportAttendanceSummary() {
    showLoadingSpinner();
    
    try {
        // Get all scouts and attendance records
        const [scoutsSnapshot, attendanceSnapshot] = await Promise.all([
            database.ref('scouts').once('value'),
            database.ref('attendance').once('value')
        ]);
        
        const scoutsData = {};
        if (scoutsSnapshot.exists()) {
            scoutsSnapshot.forEach(childSnapshot => {
                scoutsData[childSnapshot.key] = childSnapshot.val();
            });
        }
        
        const attendanceSummary = {};
        if (attendanceSnapshot.exists()) {
            const allAttendance = attendanceSnapshot.val();
            
            Object.keys(allAttendance).forEach(dateKey => {
                const dayData = allAttendance[dateKey];
                Object.keys(dayData).forEach(scoutId => {
                    if (!attendanceSummary[scoutId]) {
                        attendanceSummary[scoutId] = { present: 0, absent: 0, total: 0 };
                    }
                    const status = dayData[scoutId].status;
                    attendanceSummary[scoutId][status]++;
                    attendanceSummary[scoutId].total++;
                });
            });
        }
        
        const csvContent = generateAttendanceSummaryCSV(scoutsData, attendanceSummary);
        downloadCSV(csvContent, `attendance-summary-${new Date().toISOString().split('T')[0]}.csv`);
        
        hideLoadingSpinner();
        showNotification('Attendance summary exported!', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showNotification('Error exporting attendance summary', 'error');
        console.error('Error exporting attendance summary:', error);
    }
}

// Settings Functions
function loadSettings() {
    const meetingDay = localStorage.getItem('meetingDay') || 'tuesday';
    const meetingTime = localStorage.getItem('meetingTime') || '18:15';
    const programStart = localStorage.getItem('programStart') || new Date().getFullYear() + '-09-01';
    const programEnd = localStorage.getItem('programEnd') || (new Date().getFullYear() + 1) + '-06-30';
    
    document.getElementById('meetingDay').value = meetingDay;
    document.getElementById('meetingTime').value = meetingTime;
    document.getElementById('programStart').value = programStart;
    document.getElementById('programEnd').value = programEnd;
}

function saveSettings() {
    const meetingDay = document.getElementById('meetingDay').value;
    const meetingTime = document.getElementById('meetingTime').value;
    const programStart = document.getElementById('programStart').value;
    const programEnd = document.getElementById('programEnd').value;
    
    localStorage.setItem('meetingDay', meetingDay);
    localStorage.setItem('meetingTime', meetingTime);
    localStorage.setItem('programStart', programStart);
    localStorage.setItem('programEnd', programEnd);
    
    showNotification('Settings saved successfully!', 'success');
}

// Session management functions
async function clearAuthSession() {
    console.log('Clearing authentication session...');
    showLoadingSpinner();
    
    try {
        // Sign out any existing user
        await auth.signOut();
        
        // Clear any cached data
        currentUser = null;
        scouts = [];
        attendanceData = {};
        
        // Clear local storage
        localStorage.removeItem('firebase:authUser:' + firebaseConfig.apiKey + ':[DEFAULT]');
        localStorage.removeItem('firebase:host:' + firebaseConfig.authDomain);
        
        // Clear session storage
        sessionStorage.clear();
        
        hideLoadingSpinner();
        showLoginModal();
        showNotification('Session cleared. Please login again.', 'success');
        
        // Clear form
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
        
    } catch (error) {
        console.error('Error clearing session:', error);
        hideLoadingSpinner();
        showNotification('Error clearing session. Please refresh the page.', 'error');
    }
}

// Utility Functions
function calculateAge(birthDate) {
    if (!birthDate) return 'Unknown';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');
    
    notification.className = `notification ${type}`;
    messageSpan.textContent = message;
    
    // Set appropriate icon
    if (type === 'success') {
        icon.className = 'notification-icon fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'notification-icon fas fa-exclamation-circle';
    } else {
        icon.className = 'notification-icon fas fa-info-circle';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showAddScoutModal() {
    document.getElementById('addScoutModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No admin account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/invalid-credential':
            return 'Invalid login credentials. Please check your email and password.';
        default:
            return 'Login failed. Please check your credentials and try again.';
    }
}

// CSV Generation Functions
function generateAttendanceCSV(attendanceData) {
    const headers = ['Date', 'Scout ID', 'Scout Name', 'Status', 'Recorded By'];
    const rows = attendanceData.map(record => [
        record.date,
        record.scoutId,
        getScoutName(record.scoutId),
        record.status,
        record.recordedBy || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateScoutsCSV(scoutsData) {
    const headers = ['First Name', 'Last Name', 'Grade', 'Birth Date', 'Parent Name', 'Parent Email', 'Parent Phone', 'Emergency Contact', 'Notes'];
    const rows = scoutsData.map(scout => [
        scout.firstName,
        scout.lastName,
        scout.grade,
        scout.birthDate || '',
        scout.parentName || '',
        scout.parentEmail || '',
        scout.parentPhone || '',
        scout.emergencyContact || '',
        scout.notes || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateAttendanceSummaryCSV(scoutsData, attendanceSummary) {
    const headers = ['Scout Name', 'Grade', 'Total Sessions', 'Present', 'Absent', 'Attendance Rate'];
    const rows = Object.keys(scoutsData).map(scoutId => {
        const scout = scoutsData[scoutId];
        const summary = attendanceSummary[scoutId] || { present: 0, absent: 0, total: 0 };
        const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
        
        return [
            `${scout.firstName} ${scout.lastName}`,
            scout.grade,
            summary.total,
            summary.present,
            summary.absent,
            rate + '%'
        ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function getScoutName(scoutId) {
    const scout = scouts.find(s => s.id === scoutId);
    return scout ? `${scout.firstName} ${scout.lastName}` : 'Unknown Scout';
}

// Announcement Management Functions
let announcements = [];

async function loadAnnouncements() {
    showLoadingSpinner();

    try {
        console.log('Loading announcements from Realtime Database...');
        const announcementsRef = database.ref('announcements');
        const snapshot = await announcementsRef.once('value');

        announcements = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                announcements.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Sort announcements by timestamp (newest first)
            announcements.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        console.log('Announcements loaded, count:', announcements.length);
        displayAnnouncements(announcements);
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading announcements:', error);
        showNotification('Error loading announcements: ' + error.message, 'error');
    }
}

function displayAnnouncements(announcementsToShow) {
    const announcementsGrid = document.getElementById('announcementsGrid');

    if (announcementsToShow.length === 0) {
        announcementsGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-bullhorn" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3>No Announcements Yet</h3>
                <p>Start by creating your first announcement to inform scouts and parents.</p>
            </div>
        `;
        return;
    }

    announcementsGrid.innerHTML = announcementsToShow.map(announcement => {
        const priorityClass = `priority-${announcement.priority || 'medium'}`;
        const statusClass = announcement.active ? 'status-active' : 'status-draft';
        const dateCreated = new Date(announcement.timestamp).toLocaleDateString();

        return `
            <div class="announcement-card ${priorityClass} ${statusClass}">
                <div class="announcement-header">
                    <div class="announcement-meta">
                        <span class="announcement-priority ${priorityClass}">${(announcement.priority || 'medium').toUpperCase()}</span>
                        <span class="announcement-status ${statusClass}">${announcement.active ? 'ACTIVE' : 'DRAFT'}</span>
                    </div>
                    <div class="announcement-actions">
                        <button class="action-btn small" onclick="editAnnouncement('${announcement.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" onclick="deleteAnnouncement('${announcement.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="announcement-content">
                    <h3 class="announcement-title">${announcement.title}</h3>
                    <p class="announcement-text">${announcement.content}</p>
                    <div class="announcement-footer">
                        <span class="announcement-date">Created: ${dateCreated}</span>
                        <span class="announcement-author">By: ${announcement.author}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAddAnnouncementModal() {
    document.getElementById('addAnnouncementModal').style.display = 'flex';
    // Reset form
    document.getElementById('addAnnouncementForm').reset();
    updateAnnouncementPreview('announcementPreview', '', '');
}

function setupAnnouncementPreview(formId, previewId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const titleInput = form.querySelector('input[name="title"]');
    const contentInput = form.querySelector('textarea[name="content"]');

    if (titleInput && contentInput) {
        titleInput.addEventListener('input', () => updateAnnouncementPreview(previewId, titleInput.value, contentInput.value));
        contentInput.addEventListener('input', () => updateAnnouncementPreview(previewId, titleInput.value, contentInput.value));
    }
}

function updateAnnouncementPreview(previewId, title, content) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const previewTitle = preview.querySelector('.preview-title');
    const previewContent = preview.querySelector('.preview-content');

    previewTitle.textContent = title || 'Your announcement title will appear here';
    previewContent.textContent = content || 'Your announcement content will appear here';
}

async function handleAddAnnouncement(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const announcementData = {
        title: formData.get('title'),
        content: formData.get('content'),
        priority: formData.get('priority'),
        active: formData.get('active') === 'true',
        timestamp: Date.now(),
        author: currentUser.email,
        dateCreated: new Date().toISOString().split('T')[0]
    };

    try {
        const announcementsRef = database.ref('announcements');
        await announcementsRef.push(announcementData);

        hideLoadingSpinner();
        closeModal('addAnnouncementModal');
        showNotification('Announcement created successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error adding announcement:', error);
        showNotification('Error creating announcement: ' + error.message, 'error');
    }
}

function editAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const form = document.getElementById('editAnnouncementForm');
    form.querySelector('input[name="announcementId"]').value = announcementId;
    form.querySelector('input[name="title"]').value = announcement.title;
    form.querySelector('textarea[name="content"]').value = announcement.content;
    form.querySelector('select[name="priority"]').value = announcement.priority;
    form.querySelector('select[name="active"]').value = announcement.active.toString();

    updateAnnouncementPreview('editAnnouncementPreview', announcement.title, announcement.content);
    document.getElementById('editAnnouncementModal').style.display = 'flex';
}

async function handleEditAnnouncement(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const announcementId = formData.get('announcementId');
    const announcementData = {
        title: formData.get('title'),
        content: formData.get('content'),
        priority: formData.get('priority'),
        active: formData.get('active') === 'true',
        timestamp: Date.now(),
        author: currentUser.email,
        dateCreated: new Date().toISOString().split('T')[0]
    };

    try {
        const announcementRef = database.ref(`announcements/${announcementId}`);
        await announcementRef.update(announcementData);

        hideLoadingSpinner();
        closeModal('editAnnouncementModal');
        showNotification('Announcement updated successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error updating announcement:', error);
        showNotification('Error updating announcement: ' + error.message, 'error');
    }
}

async function deleteAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const confirmed = confirm(`Are you sure you want to delete the announcement "${announcement.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingSpinner();

    try {
        const announcementRef = database.ref(`announcements/${announcementId}`);
        await announcementRef.remove();

        hideLoadingSpinner();
        showNotification('Announcement deleted successfully!', 'success');
        loadAnnouncements(); // Reload the announcements
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error deleting announcement:', error);
        showNotification('Error deleting announcement: ' + error.message, 'error');
    }
}

// Curriculum Management Functions
let currentProgramYear = null;
let currentWeekData = null;
let currentWeekNumber = 1;
let totalWeeks = 40; // Full school year including all of June
let allWeeksData = {}; // Store all weeks for grid view
let currentViewMode = 'week'; // 'week' or 'grid'

async function loadCurriculum() {
    try {
        await loadProgramYears();
    } catch (error) {
        console.error('Error loading curriculum:', error);
        showNotification('Error loading curriculum: ' + error.message, 'error');
    }
}

async function loadProgramYears() {
    try {
        const curriculumRef = database.ref('curriculum');
        const snapshot = await curriculumRef.once('value');

        const yearSelect = document.getElementById('programYearSelect');
        yearSelect.innerHTML = '<option value="">Select Program Year</option>';

        if (snapshot.exists()) {
            const years = Object.keys(snapshot.val()).sort((a, b) => b.localeCompare(a));
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}-${parseInt(year) + 1} Program Year`;
                yearSelect.appendChild(option);
            });
        }

        // Add current year option
        const currentYear = new Date().getFullYear();
        const currentYearOption = document.createElement('option');
        currentYearOption.value = currentYear.toString();
        currentYearOption.textContent = `${currentYear}-${currentYear + 1} Program Year (Current)`;

        // Check if current year already exists in the list
        const existingOption = Array.from(yearSelect.options).find(opt => opt.value === currentYear.toString());
        if (!existingOption) {
            yearSelect.insertBefore(currentYearOption, yearSelect.children[1]);
        }

    } catch (error) {
        console.error('Error loading program years:', error);
        showNotification('Error loading program years: ' + error.message, 'error');
    }
}

async function initializeCurrentYear() {
    const currentYear = new Date().getFullYear();
    const programYearRef = database.ref(`curriculum/${currentYear}`);

    try {
        showLoadingSpinner();

        // Check if year already exists
        const snapshot = await programYearRef.once('value');
        if (snapshot.exists()) {
            showNotification(`Program year ${currentYear}-${currentYear + 1} already exists!`, 'info');
            hideLoadingSpinner();
            return;
        }

        // Create default curriculum structure for the year
        const defaultCurriculum = {};
        for (let week = 1; week <= totalWeeks; week++) {
            defaultCurriculum[`week${week}`] = {
                weekNumber: week,
                theme: '',
                meetingDate: '',
                objectives: '',
                activities: [],
                materials: '',
                assessment: '',
                notes: '',
                lastModified: Date.now(),
                modifiedBy: currentUser.email
            };
        }

        await programYearRef.set(defaultCurriculum);

        hideLoadingSpinner();
        showNotification(`Program year ${currentYear}-${currentYear + 1} initialized successfully!`, 'success');

        // Reload the year selector and select the new year
        await loadProgramYears();
        document.getElementById('programYearSelect').value = currentYear.toString();
        loadSelectedYear();

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error initializing current year:', error);
        showNotification('Error initializing year: ' + error.message, 'error');
    }
}

async function loadSelectedYear() {
    const yearSelect = document.getElementById('programYearSelect');
    const selectedYear = yearSelect.value;

    if (!selectedYear) {
        currentProgramYear = null;
        showCurriculumPlaceholder();
        return;
    }

    currentProgramYear = selectedYear;
    currentWeekNumber = 1;

    try {
        showLoadingSpinner();
        await loadAllWeeksData();

        if (currentViewMode === 'week') {
            await loadWeekData(currentWeekNumber);
            updateCurriculumNavigation();
        } else {
            displayGridView();
        }
        hideLoadingSpinner();
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading selected year:', error);
        showNotification('Error loading curriculum data: ' + error.message, 'error');
    }
}

async function loadAllWeeksData() {
    if (!currentProgramYear) return;

    try {
        const curriculumRef = database.ref(`curriculum/${currentProgramYear}`);
        const snapshot = await curriculumRef.once('value');

        allWeeksData = {};
        if (snapshot.exists()) {
            allWeeksData = snapshot.val();
        }

        // Ensure all weeks exist with default data
        for (let week = 1; week <= totalWeeks; week++) {
            if (!allWeeksData[`week${week}`]) {
                allWeeksData[`week${week}`] = getDefaultWeekData(week);
            }
        }
    } catch (error) {
        console.error('Error loading all weeks data:', error);
        showNotification('Error loading curriculum data: ' + error.message, 'error');
    }
}

async function loadWeekData(weekNumber) {
    if (!currentProgramYear) return;

    try {
        const weekRef = database.ref(`curriculum/${currentProgramYear}/week${weekNumber}`);
        const snapshot = await weekRef.once('value');

        currentWeekData = snapshot.exists() ? snapshot.val() : getDefaultWeekData(weekNumber);
        displayWeekData();
    } catch (error) {
        console.error('Error loading week data:', error);
        showNotification('Error loading week data: ' + error.message, 'error');
    }
}

function getDefaultWeekData(weekNumber) {
    return {
        weekNumber: weekNumber,
        theme: '',
        meetingDate: '',
        objectives: '',
        activities: [],
        materials: '',
        assessment: '',
        notes: '',
        lastModified: Date.now(),
        modifiedBy: currentUser.email
    };
}

function displayWeekData() {
    const display = document.getElementById('curriculumDisplay');

    if (!currentWeekData) {
        showCurriculumPlaceholder();
        return;
    }

    // Calculate meeting date for the week - find first Tuesday of September
    const year = parseInt(currentProgramYear);
    const programStart = new Date(year, 8, 1); // September 1st
    // Find the first Tuesday of September
    while (programStart.getDay() !== 2) { // 2 = Tuesday
        programStart.setDate(programStart.getDate() + 1);
    }
    const meetingDate = new Date(programStart);
    meetingDate.setDate(meetingDate.getDate() + (currentWeekNumber - 1) * 7);

    const totalDuration = currentWeekData.activities ?
        currentWeekData.activities.reduce((sum, activity) => sum + (activity.duration || 0), 0) : 0;

    display.innerHTML = `
        <div class="curriculum-week-view">
            <div class="week-header">
                <div class="week-info">
                    <h3>Week ${currentWeekData.weekNumber}</h3>
                    <p class="week-theme">${currentWeekData.theme || 'No theme set'}</p>
                    <p class="week-date">${currentWeekData.meetingDate || meetingDate.toLocaleDateString()}</p>
                    ${totalDuration > 0 ? `<p class="week-duration"><i class="fas fa-clock"></i> ${totalDuration} minutes total</p>` : ''}
                </div>
                <div class="week-status">
                    ${currentWeekData.lastModified ? `
                        <span class="last-modified">
                            <i class="fas fa-clock"></i>
                            Modified: ${new Date(currentWeekData.lastModified).toLocaleDateString()}
                        </span>
                        <span class="modified-by">
                            <i class="fas fa-user"></i>
                            By: ${currentWeekData.modifiedBy || 'Unknown'}
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="lesson-plan-view">
                <!-- Lesson Plan Header -->
                <div class="lesson-plan-header">
                    <div class="lesson-overview">
                        <div class="lesson-summary">
                            <div class="summary-item">
                                <span class="summary-label">Meeting Duration:</span>
                                <span class="summary-value">${totalDuration > 0 ? totalDuration : 90} minutes</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Activities Planned:</span>
                                <span class="summary-value">${currentWeekData.activities ? currentWeekData.activities.length : 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Grade Level:</span>
                                <span class="summary-value">7-8</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Learning Objectives Section -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-bullseye"></i> Learning Objectives</h3>
                        <span class="section-description">What scouts will learn and achieve this week</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.objectives ? `
                            <div class="objectives-list">
                                ${currentWeekData.objectives.split('\n').map(objective => objective.trim()).filter(obj => obj).map(objective => `
                                    <div class="objective-item">
                                        <i class="fas fa-check-circle"></i>
                                        <span>${objective}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-lightbulb"></i>
                                <p>No learning objectives have been set for this week yet.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Detailed Activity Timeline -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-clock"></i> Meeting Timeline & Activities</h3>
                        <span class="section-description">Detailed schedule and activity breakdown</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.activities && currentWeekData.activities.length > 0 ? `
                            <div class="activity-timeline">
                                ${currentWeekData.activities.map((activity, index) => {
                                    // Calculate start time (assuming meeting starts at 6:15 PM)
                                    const startMinutes = currentWeekData.activities.slice(0, index).reduce((sum, act) => sum + (act.duration || 0), 0);
                                    const startTime = new Date();
                                    startTime.setHours(18, 15 + startMinutes, 0); // 6:15 PM + accumulated minutes
                                    const endTime = new Date(startTime);
                                    endTime.setMinutes(endTime.getMinutes() + (activity.duration || 0));

                                    return `
                                        <div class="timeline-activity">
                                            <div class="activity-time">
                                                <div class="time-start">${startTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div>
                                                <div class="time-duration">${activity.duration || 0} min</div>
                                                <div class="time-end">${endTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div>
                                            </div>
                                            <div class="activity-content">
                                                <h4 class="activity-title">
                                                    <span class="activity-number">${index + 1}</span>
                                                    ${activity.name || 'Unnamed Activity'}
                                                </h4>
                                                <div class="activity-description">
                                                    ${activity.description ? `
                                                        <div class="description-text">${activity.description.replace(/\n/g, '<br>')}</div>
                                                    ` : `
                                                        <div class="no-description">
                                                            <i class="fas fa-info-circle"></i>
                                                            <span>No detailed description provided for this activity.</span>
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-calendar-plus"></i>
                                <p>No activities have been planned for this meeting yet.</p>
                                <small>A typical 90-minute meeting usually includes 4-6 activities.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Materials & Preparation -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-tools"></i> Materials & Preparation</h3>
                        <span class="section-description">Everything needed to run this meeting</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.materials ? `
                            <div class="materials-list">
                                ${currentWeekData.materials.split('\n').map(material => material.trim()).filter(mat => mat).map(material => `
                                    <div class="material-item">
                                        <i class="fas fa-check-square"></i>
                                        <span>${material}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-box"></i>
                                <p>No materials or preparation requirements listed yet.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Assessment & Reflection -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-clipboard-check"></i> Assessment & Reflection</h3>
                        <span class="section-description">How to evaluate learning and gather feedback</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.assessment ? `
                            <div class="assessment-content">
                                <div class="assessment-text">${currentWeekData.assessment.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-question-circle"></i>
                                <p>No assessment or reflection activities planned yet.</p>
                                <small>Consider adding reflection questions or assessment criteria.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Notes & Safety Reminders -->
                <div class="lesson-section">
                    <div class="lesson-section-header">
                        <h3><i class="fas fa-sticky-note"></i> Important Notes & Safety</h3>
                        <span class="section-description">Key reminders and safety considerations</span>
                    </div>
                    <div class="lesson-content">
                        ${currentWeekData.notes ? `
                            <div class="notes-content">
                                <div class="notes-text">${currentWeekData.notes.replace(/\n/g, '<br>')}</div>
                            </div>
                        ` : `
                            <div class="empty-section">
                                <i class="fas fa-exclamation-triangle"></i>
                                <p>No special notes or safety reminders for this week.</p>
                                <small>Consider adding any safety considerations or special instructions.</small>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="lesson-actions">
                    <div class="action-buttons">
                        <button class="lesson-action-btn print" onclick="printLessonPlan()">
                            <i class="fas fa-print"></i>
                            Print Lesson Plan
                        </button>
                        <button class="lesson-action-btn edit" onclick="editCurrentWeek()">
                            <i class="fas fa-edit"></i>
                            Edit This Week
                        </button>
                        <button class="lesson-action-btn copy" onclick="copyFromPreviousWeek()">
                            <i class="fas fa-copy"></i>
                            Copy Previous Week
                        </button>
                    </div>
                </div>

                ${!currentWeekData.objectives && !currentWeekData.activities?.length && !currentWeekData.materials && !currentWeekData.assessment && !currentWeekData.notes ? `
                    <div class="empty-lesson-plan">
                        <div class="empty-lesson-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h3>Empty Lesson Plan</h3>
                        <p>This week's lesson plan hasn't been created yet. Click "Edit This Week" to start planning detailed activities, objectives, and materials.</p>
                        <button class="start-planning-btn" onclick="editCurrentWeek()">
                            <i class="fas fa-plus"></i>
                            Start Planning This Week
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function showCurriculumPlaceholder() {
    const display = document.getElementById('curriculumDisplay');
    display.innerHTML = `
        <div class="curriculum-placeholder">
            <i class="fas fa-book-open"></i>
            <h3>Select a Program Year</h3>
            <p>Choose a program year to view and edit curriculum content</p>
        </div>
    `;
}

function updateCurriculumNavigation() {
    document.getElementById('currentWeekNumber').textContent = currentWeekNumber;

    if (currentProgramYear) {
        const year = parseInt(currentProgramYear);
        const programStart = new Date(year, 8, 1); // September 1st
        // Find the first Tuesday of September
        while (programStart.getDay() !== 2) { // 2 = Tuesday
            programStart.setDate(programStart.getDate() + 1);
        }
        const weekDate = new Date(programStart);
        weekDate.setDate(weekDate.getDate() + (currentWeekNumber - 1) * 7);
        document.getElementById('currentWeekDate').textContent = weekDate.toLocaleDateString();

        // Enable/disable navigation buttons
        document.getElementById('prevWeekBtn').disabled = currentWeekNumber <= 1;
        document.getElementById('nextWeekBtn').disabled = currentWeekNumber >= totalWeeks;
        document.getElementById('editWeekBtn').disabled = false;
        document.getElementById('copyWeekBtn').disabled = currentWeekNumber <= 1;
    } else {
        document.getElementById('currentWeekDate').textContent = 'Select a year';
        document.getElementById('editWeekBtn').disabled = true;
        document.getElementById('copyWeekBtn').disabled = true;
    }
}

function navigateWeek(direction) {
    if (!currentProgramYear) return;

    const newWeek = currentWeekNumber + direction;
    if (newWeek < 1 || newWeek > totalWeeks) return;

    currentWeekNumber = newWeek;
    loadWeekData(currentWeekNumber);
    updateCurriculumNavigation();
}

function editCurrentWeek() {
    if (!currentProgramYear || !currentWeekData) return;

    // Populate the edit form
    const form = document.getElementById('editCurriculumForm');
    form.querySelector('input[name="programYear"]').value = currentProgramYear;
    form.querySelector('input[name="weekNumber"]').value = currentWeekNumber;
    form.querySelector('input[name="displayWeek"]').value = currentWeekNumber;
    form.querySelector('input[name="theme"]').value = currentWeekData.theme || '';
    form.querySelector('input[name="meetingDate"]').value = currentWeekData.meetingDate || '';
    form.querySelector('textarea[name="objectives"]').value = currentWeekData.objectives || '';
    form.querySelector('textarea[name="materials"]').value = currentWeekData.materials || '';
    form.querySelector('textarea[name="assessment"]').value = currentWeekData.assessment || '';
    form.querySelector('textarea[name="notes"]').value = currentWeekData.notes || '';

    // Populate activities
    populateActivitiesList(currentWeekData.activities || []);

    // Update modal title
    document.getElementById('curriculumModalTitle').textContent = `Edit Week ${currentWeekNumber} Curriculum`;

    // Show modal
    document.getElementById('editCurriculumModal').style.display = 'flex';
}

function populateActivitiesList(activities) {
    const activitiesList = document.getElementById('activitiesList');
    activitiesList.innerHTML = '';

    if (activities.length === 0) {
        addActivity(); // Add one empty activity
        return;
    }

    activities.forEach(activity => {
        const activityHtml = `
            <div class="activity-item">
                <input type="text" placeholder="Activity name" class="activity-name" value="${activity.name || ''}">
                <input type="number" placeholder="Duration (min)" class="activity-duration" min="1" max="90" value="${activity.duration || ''}">
                <textarea placeholder="Activity description" class="activity-description" rows="2">${activity.description || ''}</textarea>
                <button type="button" class="remove-activity-btn" onclick="removeActivity(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        activitiesList.insertAdjacentHTML('beforeend', activityHtml);
    });
}

function addActivity() {
    const activitiesList = document.getElementById('activitiesList');
    const activityHtml = `
        <div class="activity-item">
            <input type="text" placeholder="Activity name" class="activity-name">
            <input type="number" placeholder="Duration (min)" class="activity-duration" min="1" max="90">
            <textarea placeholder="Activity description" class="activity-description" rows="2"></textarea>
            <button type="button" class="remove-activity-btn" onclick="removeActivity(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    activitiesList.insertAdjacentHTML('beforeend', activityHtml);
}

function removeActivity(button) {
    const activitiesList = document.getElementById('activitiesList');
    if (activitiesList.children.length > 1) {
        button.closest('.activity-item').remove();
    }
}

async function handleEditCurriculum(e) {
    e.preventDefault();
    showLoadingSpinner();

    const formData = new FormData(e.target);
    const programYear = formData.get('programYear');
    const weekNumber = formData.get('weekNumber');

    // Collect activities
    const activities = [];
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        const name = item.querySelector('.activity-name').value.trim();
        const duration = item.querySelector('.activity-duration').value;
        const description = item.querySelector('.activity-description').value.trim();

        if (name) {
            activities.push({
                name: name,
                duration: parseInt(duration) || 0,
                description: description
            });
        }
    });

    const curriculumData = {
        weekNumber: parseInt(weekNumber),
        theme: formData.get('theme'),
        meetingDate: formData.get('meetingDate'),
        objectives: formData.get('objectives'),
        activities: activities,
        materials: formData.get('materials'),
        assessment: formData.get('assessment'),
        notes: formData.get('notes'),
        lastModified: Date.now(),
        modifiedBy: currentUser.email
    };

    try {
        const weekRef = database.ref(`curriculum/${programYear}/week${weekNumber}`);
        await weekRef.set(curriculumData);

        hideLoadingSpinner();
        closeModal('editCurriculumModal');
        showNotification('Curriculum updated successfully!', 'success');

        // Reload the current week data
        await loadWeekData(currentWeekNumber);

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error updating curriculum:', error);
        showNotification('Error updating curriculum: ' + error.message, 'error');
    }
}

async function copyFromPreviousWeek() {
    if (!currentProgramYear || currentWeekNumber <= 1) return;

    const confirmed = confirm(`Copy curriculum content from Week ${currentWeekNumber - 1} to Week ${currentWeekNumber}?`);
    if (!confirmed) return;

    try {
        showLoadingSpinner();

        const prevWeekRef = database.ref(`curriculum/${currentProgramYear}/week${currentWeekNumber - 1}`);
        const snapshot = await prevWeekRef.once('value');

        if (!snapshot.exists()) {
            showNotification('Previous week has no content to copy', 'info');
            hideLoadingSpinner();
            return;
        }

        const prevWeekData = snapshot.val();
        const newWeekData = {
            ...prevWeekData,
            weekNumber: currentWeekNumber,
            meetingDate: '', // Clear the date
            lastModified: Date.now(),
            modifiedBy: currentUser.email
        };

        const currentWeekRef = database.ref(`curriculum/${currentProgramYear}/week${currentWeekNumber}`);
        await currentWeekRef.set(newWeekData);

        hideLoadingSpinner();
        showNotification(`Content copied from Week ${currentWeekNumber - 1}!`, 'success');

        // Reload the current week data
        await loadWeekData(currentWeekNumber);

    } catch (error) {
        hideLoadingSpinner();
        console.error('Error copying from previous week:', error);
        showNotification('Error copying content: ' + error.message, 'error');
    }
}

// View switching functions
function switchToWeekView() {
    currentViewMode = 'week';
    document.getElementById('weekViewContainer').style.display = 'block';
    document.getElementById('gridViewContainer').style.display = 'none';
    document.getElementById('weekViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');

    if (currentProgramYear) {
        loadWeekData(currentWeekNumber);
        updateCurriculumNavigation();
    }
}

function switchToGridView() {
    currentViewMode = 'grid';
    document.getElementById('weekViewContainer').style.display = 'none';
    document.getElementById('gridViewContainer').style.display = 'block';
    document.getElementById('weekViewBtn').classList.remove('active');
    document.getElementById('gridViewBtn').classList.add('active');

    if (currentProgramYear) {
        displayGridView();
    }
}

function displayGridView() {
    const gridContainer = document.getElementById('curriculumGrid');

    if (!currentProgramYear || !allWeeksData) {
        gridContainer.innerHTML = `
            <div class="grid-placeholder">
                <i class="fas fa-calendar-alt"></i>
                <h3>No Program Year Selected</h3>
                <p>Select a program year to view the curriculum overview</p>
            </div>
        `;
        return;
    }

    const weeks = [];
    for (let week = 1; week <= totalWeeks; week++) {
        const weekData = allWeeksData[`week${week}`] || getDefaultWeekData(week);
        weeks.push(weekData);
    }

    gridContainer.innerHTML = weeks.map(week => {
        const year = parseInt(currentProgramYear);
        const programStart = new Date(year, 8, 1); // September 1st
        // Find the first Tuesday of September
        while (programStart.getDay() !== 2) { // 2 = Tuesday
            programStart.setDate(programStart.getDate() + 1);
        }
        const weekDate = new Date(programStart);
        weekDate.setDate(weekDate.getDate() + (week.weekNumber - 1) * 7);

        const hasContent = week.theme || week.objectives ||
                          (week.activities && week.activities.length > 0) ||
                          week.materials || week.assessment || week.notes;

        const totalDuration = week.activities ?
            week.activities.reduce((sum, activity) => sum + (activity.duration || 0), 0) : 0;

        return `
            <div class="grid-week-card ${hasContent ? 'has-content' : 'empty'}"
                 onclick="selectWeekFromGrid(${week.weekNumber})"
                 data-week="${week.weekNumber}"
                 data-month="${weekDate.getMonth() + 1}"
                 data-search-text="${(week.theme || '').toLowerCase()} ${(week.objectives || '').toLowerCase()}">
                <div class="grid-week-header">
                    <span class="grid-week-number">Week ${week.weekNumber}</span>
                    <span class="grid-week-date">${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div class="grid-week-content">
                    <h4 class="grid-week-theme">${week.theme || 'No theme set'}</h4>
                    ${week.activities && week.activities.length > 0 ? `
                        <div class="grid-week-activities">
                            <span class="activity-count">${week.activities.length} activities</span>
                            ${totalDuration > 0 ? `<span class="activity-duration">${totalDuration} min</span>` : ''}
                        </div>
                        <div class="grid-activity-list">
                            ${week.activities.slice(0, 3).map(activity => `
                                <div class="grid-activity-item">${activity.name}</div>
                            `).join('')}
                            ${week.activities.length > 3 ? `<div class="grid-activity-more">+${week.activities.length - 3} more</div>` : ''}
                        </div>
                    ` : `
                        <div class="grid-no-content">
                            <i class="fas fa-plus-circle"></i>
                            <span>Click to add content</span>
                        </div>
                    `}
                </div>
                <div class="grid-week-actions">
                    <button class="grid-edit-btn" onclick="event.stopPropagation(); editWeekFromGrid(${week.weekNumber})" title="Edit Week">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${hasContent ? `
                        <div class="grid-content-status">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function selectWeekFromGrid(weekNumber) {
    currentWeekNumber = weekNumber;
    switchToWeekView();
}

function editWeekFromGrid(weekNumber) {
    currentWeekNumber = weekNumber;
    currentWeekData = allWeeksData[`week${weekNumber}`] || getDefaultWeekData(weekNumber);
    editCurrentWeek();
}

function filterGridWeeks() {
    const searchTerm = document.getElementById('gridSearchInput').value.toLowerCase();
    const monthFilter = document.getElementById('monthFilterSelect').value;
    const weekCards = document.querySelectorAll('.grid-week-card');

    weekCards.forEach(card => {
        const searchText = card.getAttribute('data-search-text') || '';
        const cardMonth = card.getAttribute('data-month');

        const matchesSearch = !searchTerm || searchText.includes(searchTerm);
        const matchesMonth = !monthFilter || cardMonth === monthFilter;

        if (matchesSearch && matchesMonth) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Print lesson plan function
function printLessonPlan() {
    const lessonPlanContent = document.querySelector('.lesson-plan-view');
    if (!lessonPlanContent) {
        showNotification('No lesson plan to print', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Week ${currentWeekNumber} Lesson Plan - ${currentWeekData?.theme || 'SGSA Scouts'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .lesson-section { margin-bottom: 30px; page-break-inside: avoid; }
                .lesson-section-header h3 { color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px; }
                .section-description { font-style: italic; color: #666; font-size: 0.9em; }
                .activity-timeline { margin-top: 15px; }
                .timeline-activity { margin-bottom: 20px; border-left: 3px solid #2c5aa0; padding-left: 15px; }
                .activity-time { font-weight: bold; color: #2c5aa0; margin-bottom: 8px; }
                .activity-title { margin-bottom: 8px; }
                .activity-number { background: #2c5aa0; color: white; border-radius: 50%; width: 25px; height: 25px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; }
                .objective-item, .material-item { margin-bottom: 8px; }
                .lesson-plan-header { border-bottom: 3px solid #2c5aa0; margin-bottom: 30px; padding-bottom: 15px; }
                .lesson-summary { display: flex; gap: 30px; }
                .summary-item { display: flex; flex-direction: column; }
                .summary-label { font-weight: bold; color: #666; font-size: 0.9em; }
                .summary-value { font-size: 1.1em; color: #2c5aa0; font-weight: bold; }
                .lesson-actions, .empty-lesson-plan { display: none; }
                @media print { .lesson-actions, .empty-lesson-plan { display: none !important; } }
            </style>
        </head>
        <body>
            <h1>SGSA Scouts - Week ${currentWeekNumber} Lesson Plan</h1>
            <h2>${currentWeekData?.theme || 'Weekly Meeting Plan'}</h2>
            <p><strong>Date:</strong> ${document.getElementById('currentWeekDate')?.textContent || 'TBD'}</p>
            ${lessonPlanContent.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Global functions for HTML onclick events
function editScout(scoutId) {
    showNotification('Edit functionality coming soon!', 'info');
}