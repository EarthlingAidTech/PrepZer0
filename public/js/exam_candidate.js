// Global variables
let allCandidates = [];
let filteredCandidates = [];
let currentPage = 1;
let pageSize = 50;
let searchTimeout = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Get exam data from window object (set in EJS)
    if (window.examData) {
        initializePage();
    } else {
        console.error('Exam data not found');
    }
});

function initializePage() {
    // Load initial candidates data
    loadCandidates();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start periodic updates (every 30 seconds) - but only update data, not full reload
    startPeriodicUpdates();
}

function setupEventListeners() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounceSearch);
    }
    
    // Filter selectors
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');
    const pageSizeSelect = document.getElementById('pageSize');
    
    if (departmentFilter) departmentFilter.addEventListener('change', handleFilter);
    if (statusFilter) statusFilter.addEventListener('change', handleFilter);
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', handlePageSizeChange);
}

// Load candidates data via AJAX
async function loadCandidates(page = 1, search = '', filters = {}) {
    try {
        showLoadingState();
        
        const params = new URLSearchParams({
            page: page,
            limit: pageSize,
            search: search,
            ajax: 'true', // Add this to identify AJAX requests
            ...filters
        });
        
        const url = `/admin/exam/candidates/${window.examData.examId}?${params}`;
        console.log('Making AJAX request to:', url); // DEBUG LOG
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status); // DEBUG LOG
        console.log('Response headers:', response.headers); // DEBUG LOG
        
        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText); // DEBUG LOG
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType); // DEBUG LOG
        
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Expected JSON but got:', contentType); // DEBUG LOG
            console.error('Response body:', responseText); // DEBUG LOG
            throw new Error(`Expected JSON response but got ${contentType}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data); // DEBUG LOG
        
        if (data.success) {
            allCandidates = data.candidates;
            filteredCandidates = data.candidates;
            currentPage = data.currentPage;
            
            renderCandidates();
            updatePagination(data.totalCandidates, data.totalPages);
            updateCandidateCount(data.totalCandidates);
        } else {
            showError('Failed to load candidates: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
        console.error('Error stack:', error.stack); // DEBUG LOG
        
        // More specific error messages
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showError('Connection failed. Please check if the server is running and try again.');
        } else if (error.message.includes('HTTP error')) {
            showError('Server error: ' + error.message);
        } else {
            showError('Network error while loading candidates. Please refresh the page. ' + error.message);
        }
    } finally {
        hideLoadingState();
    }
}

// Render candidates table
function renderCandidates() {
    const tableBody = document.getElementById('candidatesTable');
    const noResults = document.getElementById('no-search-results');
    const noCandidates = document.getElementById('no-candidates');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (filteredCandidates.length === 0) {
        if (allCandidates.length === 0) {
            showEmptyState(noCandidates);
            hideEmptyState(noResults);
        } else {
            showEmptyState(noResults);
            hideEmptyState(noCandidates);
        }
        return;
    }
    
    // Hide empty states
    hideEmptyState(noResults);
    hideEmptyState(noCandidates);
    
    // Render candidate rows
    filteredCandidates.forEach(candidate => {
        const row = createCandidateRow(candidate);
        tableBody.appendChild(row);
    });
}

// Create a single candidate row
function createCandidateRow(candidate) {
    const row = document.createElement('tr');
    row.className = 'candidate-row';
    
    // Add highlighting based on status
    if (candidate.activityStatus === 'active' && !candidate.hasSubmitted) {
        row.style.backgroundColor = 'rgba(23, 162, 184, 0.05)';
    } else if (candidate.activityStatus === 'active') {
        row.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
    }
    
    // Build the row HTML dynamically based on exam type
    let rowHTML = `
        <td><strong>${escapeHtml(candidate.student.USN)}</strong></td>
        <td>${escapeHtml(candidate.student.Rollno || 'N/A')}</td>
        <td><span class="department-badge">${escapeHtml(candidate.student.Department || 'N/A')}</span></td>
        <td>${escapeHtml(candidate.student.Semester || 'N/A')}</td>
        <td>${renderActivityStatus(candidate)}</td>
        <td>${renderScore(candidate)}</td>
    `;
    
    // Add MCQ and Coding score columns if both are present
    if (window.examData.hasMCQ && window.examData.hasCoding) {
        rowHTML += renderMCQCodingScores(candidate);
    }
    
    // Add evaluation status column if coding is present
    if (window.examData.hasCoding) {
        rowHTML += `<td>${renderEvaluationStatus(candidate)}</td>`;
    }
    
    // Add submitted at and actions columns
    rowHTML += `
        <td>${renderSubmittedAt(candidate)}</td>
        <td>${renderActions(candidate)}</td>
    `;
    
    row.innerHTML = rowHTML;
    return row;
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper functions for rendering different parts of the row
function renderActivityStatus(candidate) {
    if (!candidate.activityStatus) {
        return '<span class="badge badge-secondary">offline</span>';
    }
    
    const statusClass = candidate.activityStatus === 'active' ? 'badge-success' : 
                       (candidate.activityStatus === 'inactive' ? 'badge-warning' : 'badge-secondary');
    
    let html = `<span class="badge ${statusClass}">${candidate.activityStatus}</span>`;
    
    if (candidate.lastActive) {
        const lastActiveTime = new Date(candidate.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        html += `<br><small class="text-muted">Last seen: ${lastActiveTime}</small>`;
    }
    
    return html;
}

function renderScore(candidate) {
    if (candidate.score === 'In progress') {
        return '<span class="badge badge-info">In progress</span>';
    } else if (candidate.score === 'N/A' || !candidate.score) {
        return '<span class="badge badge-secondary">N/A</span>';
    } else {
        let html = `<strong>${candidate.score}</strong>`;
        if (window.examData.hasMCQ && window.examData.hasCoding) {
            html += `<div class="score-breakdown">MCQ: ${candidate.mcqScore}/${candidate.maxMCQScore} | Coding: ${candidate.codingScore}/${candidate.maxCodingScore}</div>`;
        }
        return html;
    }
}

function renderMCQCodingScores(candidate) {
    const mcqScore = candidate.hasSubmitted ? 
        `<span class="badge badge-info">${candidate.mcqScore}/${candidate.maxMCQScore}</span>` :
        '<span class="badge badge-secondary">-/-</span>';
    
    let codingScore;
    if (candidate.hasSubmitted) {
        if (candidate.evaluationStatus === 'Evaluated') {
            codingScore = `<span class="badge badge-success">${candidate.codingScore}/${candidate.maxCodingScore}</span>`;
        } else {
            codingScore = '<span class="badge badge-warning">Pending</span>';
        }
    } else {
        codingScore = '<span class="badge badge-secondary">-/-</span>';
    }
    
    return `<td>${mcqScore}</td><td>${codingScore}</td>`;
}

function renderEvaluationStatus(candidate) {
    if (!candidate.evaluationStatus) {
        return '<span class="badge badge-secondary">Not Applicable</span>';
    }
    
    const statusClass = candidate.evaluationStatus === 'Evaluated' ? 'badge-success' : 'badge-warning';
    return `<span class="badge ${statusClass}">${candidate.evaluationStatus}</span>`;
}

function renderSubmittedAt(candidate) {
    if (candidate.submittedAt) {
        const date = new Date(candidate.submittedAt);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (candidate.activityStatus === 'active') {
        return '<span class="badge badge-info">Exam in progress</span>';
    } else {
        return 'N/A';
    }
}

function renderActions(candidate) {
    if (candidate.submission && candidate.submission._id) {
        let html = `<a href="/admin/exam/submission/${candidate.submission._id}" class="btn btn-sm btn-info">
                        <i class="fas fa-eye"></i> View Details
                    </a>`;
        
        if (window.examData.hasCoding && candidate.evaluationStatus !== 'Evaluated') {
            html += `<a href="/admin/exam/${window.examData.examId}/evaluate/${candidate.student._id}" class="btn btn-sm btn-warning mt-1">
                        <i class="fas fa-code"></i> Evaluate
                    </a>`;
        }
        
        return html;
    } else {
        return `<button class="btn btn-sm btn-secondary" disabled>
                    <i class="fas fa-clock"></i> Pending
                </button>`;
    }
}

// Search functionality with debouncing
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleSearch();
    }, 300); // Wait 300ms after user stops typing
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const filters = getCurrentFilters();
    
    currentPage = 1; // Reset to first page
    loadCandidates(currentPage, searchTerm, filters);
}

function handleFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const filters = getCurrentFilters();
    
    currentPage = 1; // Reset to first page
    loadCandidates(currentPage, searchTerm, filters);
}

function getCurrentFilters() {
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    return {
        department: departmentFilter ? departmentFilter.value : '',
        status: statusFilter ? statusFilter.value : ''
    };
}

function handlePageSizeChange() {
    const pageSizeSelect = document.getElementById('pageSize');
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1; // Reset to first page
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const filters = getCurrentFilters();
    loadCandidates(currentPage, searchTerm, filters);
}

// Pagination functions
function changePage(direction) {
    const newPage = currentPage + direction;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const filters = getCurrentFilters();
    
    loadCandidates(newPage, searchTerm, filters);
}

function goToPage(page) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const filters = getCurrentFilters();
    
    loadCandidates(page, searchTerm, filters);
}

function updatePagination(totalCandidates, totalPages) {
    // Update pagination info
    const showingStart = ((currentPage - 1) * pageSize) + 1;
    const showingEnd = Math.min(currentPage * pageSize, totalCandidates);
    
    document.getElementById('showing-start').textContent = totalCandidates > 0 ? showingStart : 0;
    document.getElementById('showing-end').textContent = showingEnd;
    document.getElementById('showing-total').textContent = totalCandidates;
    
    // Update pagination buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    // Update page numbers
    updatePageNumbers(totalPages);
}

function updatePageNumbers(totalPages) {
    const pageNumbersContainer = document.getElementById('page-numbers');
    if (!pageNumbersContainer) return;
    
    let html = '';
    
    // Don't show page numbers if there's only one page
    if (totalPages <= 1) {
        pageNumbersContainer.innerHTML = '';
        return;
    }
    
    // Show page numbers (max 5 visible)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    // Add first page if not visible
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += '<span style="padding: 0 0.5rem; color: var(--secondary-text);">...</span>';
        }
    }
    
    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Add last page if not visible
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span style="padding: 0 0.5rem; color: var(--secondary-text);">...</span>';
        }
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    pageNumbersContainer.innerHTML = html;
}

function updateCandidateCount(total) {
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = total;
    }
}

// Loading and error states
function showLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.style.display = 'block';
    }
}

function hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

function showError(message) {
    // Create a better error display instead of alert
    const existingError = document.getElementById('error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.maxWidth = '400px';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button type="button" style="float: right; background: none; border: none; color: inherit; font-size: 1.2em; cursor: pointer;" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv && errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
    
    console.error(message);
}

function showEmptyState(element) {
    if (element) {
        element.style.display = 'block';
    }
}

function hideEmptyState(element) {
    if (element) {
        element.style.display = 'none';
    }
}

// Periodic updates (replace the full page reload)
function startPeriodicUpdates() {
    setInterval(() => {
        updateCandidateData();
    }, 30000); // Every 30 seconds
}

async function updateCandidateData() {
    try {
        // Silently update data without showing loading state
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const filters = getCurrentFilters();
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: pageSize,
            search: searchTerm,
            ajax: 'true', // Add this to identify AJAX requests
            ...filters
        });
        
        const response = await fetch(`/admin/exam/candidates/${window.examData.examId}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Only update if data has changed
            const currentDataHash = JSON.stringify(allCandidates);
            const newDataHash = JSON.stringify(data.candidates);
            
            if (currentDataHash !== newDataHash) {
                allCandidates = data.candidates;
                filteredCandidates = data.candidates;
                renderCandidates();
                updatePagination(data.totalCandidates, data.totalPages);
                updateCandidateCount(data.totalCandidates);
                
                console.log('Candidate data updated automatically');
            }
        }
    } catch (error) {
        console.error('Error updating candidate data:', error);
        // Don't show error to user for background updates
        // Only log silently to avoid disrupting user experience
    }
}