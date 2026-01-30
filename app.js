// ============================================
// LETTERBOXD-STYLE MONTHLY MOVIE SUMMARY
// Enhanced Mobile-First UX
// ============================================

// TMDB API Configuration
const TMDB_API_KEY = '2dca580c2a14b55200e784d157207b4d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// CORS Proxies for Letterboxd scraping
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// ============================================
// STATE
// ============================================

let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let movies = [];
let isComplete = false;
let currentView = 'grid';
let showDatesOnPosters = true;
let showStarRatings = true;
let showLetterboxdAttribution = true;
let letterboxdUsername = null; // Set when importing from Letterboxd diary
let currentListData = null; // Set when importing from Letterboxd list
let currentImportMode = 'diary'; // 'diary' or 'list'
let originalListOrder = []; // Preserve original list order for reset
let isPanelOpen = false;

// Custom list management
let customLists = []; // Array of user-created lists
let activeListId = null; // Currently active/editing list

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================
// DOM ELEMENTS
// ============================================

const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const movieInput = document.getElementById('movie-input');
const yearInput = document.getElementById('year-input');
const ratingSelect = document.getElementById('rating-select');
const rewatchCheckbox = document.getElementById('rewatch-checkbox');
const watchDateInput = document.getElementById('watch-date-input');
const addMovieBtn = document.getElementById('add-movie-btn');
const completeBtn = document.getElementById('complete-btn');
const downloadBtn = document.getElementById('download-btn');
const monthTitle = document.getElementById('month-title');
const movieCount = document.getElementById('movie-count');
const moviesGrid = document.getElementById('movies-grid');
const calendarView = document.getElementById('calendar-view');
const movieListItems = document.getElementById('movie-list-items');
const toastContainer = document.getElementById('toast-container');

// Letterboxd elements
const letterboxdUrl = document.getElementById('letterboxd-url');
const importDiaryBtn = document.getElementById('import-diary-btn');
const importProgress = document.getElementById('import-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// List mode elements
const listUrlInput = document.getElementById('list-url');
const importListBtn = document.getElementById('import-list-btn');
const listSortOptions = document.getElementById('list-sort-options');
const listSortSelect = document.getElementById('list-sort');
const diaryModeContent = document.getElementById('diary-mode');
const listModeContent = document.getElementById('list-mode');

// Panel elements
const controlsPanel = document.getElementById('controls-panel');
const panelOverlay = document.getElementById('panel-overlay');
const panelClose = document.getElementById('panel-close');

// List elements
const clearMoviesBtn = document.getElementById('clear-movies-btn');
const movieListCount = document.getElementById('movie-list-count');
const headerMovieCount = document.getElementById('header-movie-count');

// View toggle
const gridViewBtn = document.getElementById('grid-view-btn');
const calendarViewBtn = document.getElementById('calendar-view-btn');

// Checkboxes
const showDatesCheckbox = document.getElementById('show-dates-checkbox');
const showRatingsCheckbox = document.getElementById('show-ratings-checkbox');
const showAttributionCheckbox = document.getElementById('show-attribution-checkbox');
const attributionToggle = document.getElementById('attribution-toggle');

// FAB buttons
const fabAdd = document.getElementById('fab-add');
const fabDownload = document.getElementById('fab-download');
const movieCountBtn = document.getElementById('movie-count-btn');

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : '✕';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Remove after animation
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showError(message) {
  showToast(message, 'error');
}

function showSuccess(message) {
  showToast(message, 'success');
}

// ============================================
// PANEL CONTROLS (Mobile)
// ============================================

function openPanel() {
  isPanelOpen = true;
  controlsPanel.classList.add('active');
  panelOverlay.classList.add('active');
  document.body.classList.add('panel-open');
}

function closePanel() {
  isPanelOpen = false;
  controlsPanel.classList.remove('active');
  panelOverlay.classList.remove('active');
  document.body.classList.remove('panel-open');
}

function togglePanel() {
  if (isPanelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

// Panel event listeners
if (fabAdd) fabAdd.addEventListener('click', openPanel);
if (movieCountBtn) movieCountBtn.addEventListener('click', openPanel);
if (panelClose) panelClose.addEventListener('click', closePanel);
if (panelOverlay) panelOverlay.addEventListener('click', closePanel);

// Swipe down to close panel
let touchStartY = 0;
let touchCurrentY = 0;

controlsPanel?.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

controlsPanel?.addEventListener('touchmove', (e) => {
  touchCurrentY = e.touches[0].clientY;
  const diff = touchCurrentY - touchStartY;
  
  if (diff > 0 && diff < 200) {
    controlsPanel.style.transform = `translateY(${diff}px)`;
  }
}, { passive: true });

controlsPanel?.addEventListener('touchend', () => {
  const diff = touchCurrentY - touchStartY;
  
  if (diff > 100) {
    closePanel();
  }
  
  controlsPanel.style.transform = '';
  touchStartY = 0;
  touchCurrentY = 0;
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function ratingToStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  return stars;
}

function formatDateBadge(dateStr) {
  if (!dateStr) return '';
  
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthName = MONTH_NAMES[month - 1].slice(0, 3);
    return `${monthName} ${day}`;
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const day = d.getDate();
  return `${month} ${day}`;
}

function getSelectedMonthDisplay() {
  return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
}

function getExportTitle() {
  // Use list title if in list mode
  if (currentListData && currentImportMode === 'list') {
    return currentListData.title;
  }
  return getSelectedMonthDisplay();
}

function getExportSubtitle() {
  const count = movies.length;
  if (currentListData && currentImportMode === 'list') {
    return `${count} film${count !== 1 ? 's' : ''} • by ${currentListData.creator}`;
  }
  return `${count} film${count !== 1 ? 's' : ''} watched`;
}

function parseWatchedDate(dateStr) {
  if (dateStr && typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return dateStr ? new Date(dateStr) : new Date(0);
}

function sortMoviesByDate() {
  movies.sort((a, b) => {
    const dateA = parseWatchedDate(a.watchedDate);
    const dateB = parseWatchedDate(b.watchedDate);
    return dateA - dateB;
  });
  computeWatchIndices();
}

function computeWatchIndices() {
  const watchCounts = {};
  movies.forEach(movie => {
    const key = `${movie.title.toLowerCase()}-${movie.year || 'unknown'}`;
    watchCounts[key] = (watchCounts[key] || 0) + 1;
    movie.watchIndex = watchCounts[key];
  });
}

// ============================================
// TMDB API FUNCTIONS
// ============================================

async function searchMovie(title, year = null) {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: title,
    language: 'en-US',
    page: 1
  });
  
  if (year) params.append('year', year);
  
  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    if (!response.ok) throw new Error('Failed to search TMDB');
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error('TMDB API Error:', error);
    throw error;
  }
}

async function fetchMoviePosters(movieId) {
  try {
    // Fetch posters from all languages for maximum variety
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null,ja,ko,zh,de,fr,es,it,ru,pt`
    );
    if (!response.ok) throw new Error('Failed to fetch posters');
    const data = await response.json();
    
    if (data.posters?.length > 0) {
      // Return poster objects with language info
      const sortedPosters = data.posters
        .sort((a, b) => {
          // English first (en or null which is often English)
          const aIsEnglish = a.iso_639_1 === 'en' || a.iso_639_1 === null;
          const bIsEnglish = b.iso_639_1 === 'en' || b.iso_639_1 === null;
          
          if (aIsEnglish && !bIsEnglish) return -1;
          if (!aIsEnglish && bIsEnglish) return 1;
          
          // Then by vote count (popularity)
          return (b.vote_count || 0) - (a.vote_count || 0);
        })
        .slice(0, 30)
        .map(p => ({
          url: getPosterUrl(p.file_path),
          lang: p.iso_639_1 || 'en',
          isEnglish: p.iso_639_1 === 'en' || p.iso_639_1 === null
        }))
        .filter(p => p.url !== null);
      
      return sortedPosters;
    }
    return [];
  } catch (error) {
    console.error('Error fetching posters:', error);
    return [];
  }
}

// Helper to get just URLs from poster objects (for backward compatibility)
function getPosterUrls(posterObjects) {
  if (!posterObjects || posterObjects.length === 0) return [];
  // Handle both old format (array of strings) and new format (array of objects)
  if (typeof posterObjects[0] === 'string') return posterObjects;
  return posterObjects.map(p => p.url);
}

function getPosterUrl(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

// ============================================
// CUSTOM POSTER VALIDATION
// ============================================

function isValidImageUrl(url) {
  // Check for valid image extensions
  const validExtensions = /\.(jpg|jpeg|png|webp)(\?.*)?$/i;
  
  // Block dangerous URLs
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
    return false;
  }
  
  // Must be http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Check extension (allow query params after extension)
  return validExtensions.test(url) || url.includes('image') || url.includes('poster');
}

async function validateImageUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      resolve(false);
    }, 10000);
    
    img.onload = () => {
      clearTimeout(timeout);
      // Check aspect ratio (should be roughly 2:3 for posters, ±30% tolerance)
      const ratio = img.naturalWidth / img.naturalHeight;
      const isValidRatio = ratio >= 0.5 && ratio <= 0.9; // Poster-ish ratio
      
      if (!isValidRatio) {
        console.warn('Image ratio may not be ideal for poster:', ratio);
      }
      
      resolve(true); // Accept anyway, just warn
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
}

// ============================================
// MOVIE CARD RENDERING
// ============================================

function createMovieCard(movie, index) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;
  card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
  
  // Only show stars if rating exists AND toggle is on
  const hasRating = movie.rating !== null && movie.rating !== undefined;
  const stars = (showStarRatings && hasRating) ? ratingToStars(movie.rating) : '';
  const rewatchIcon = movie.rewatch ? '<span class="rewatch-icon">↻</span>' : '';
  const dateBadge = (showDatesOnPosters && movie.watchedDate) 
    ? `<div class="date-badge">${formatDateBadge(movie.watchedDate)}</div>` 
    : '';
  const rewatchBadge = (movie.watchIndex && movie.watchIndex > 1) 
    ? `<div class="rewatch-badge">x${movie.watchIndex}</div>` 
    : '';
  const hasAlternatives = movie.allPosters && movie.allPosters.length > 1;
  
  // Use custom poster if set, otherwise default
  const displayPoster = movie.customPosterUrl || movie.posterUrl;
  
  // Show stars overlay only if there's content
  const starsContent = stars || rewatchIcon;
  const starsOverlay = starsContent ? `<div class="stars-overlay">${stars}${rewatchIcon}</div>` : '';
  
  card.innerHTML = `
    <div class="poster-container">
      ${dateBadge}
      ${rewatchBadge}
      <img 
        src="${displayPoster}" 
        alt="${movie.title}"
        class="poster-img"
        crossorigin="anonymous"
        loading="lazy"
      />
      ${starsOverlay}
      ${!isComplete ? `
        <div class="poster-picker-trigger" title="Change poster">
          <span>⚡</span>
        </div>
      ` : ''}
    </div>
  `;
  
  if (!isComplete && hasAlternatives) {
    const trigger = card.querySelector('.poster-picker-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openPosterPicker(movie);
    });
  }
  
  return card;
}

// ============================================
// POSTER PICKER MODAL
// ============================================

function openPosterPicker(movie) {
  closePosterPicker();
  
  // Normalize posters to object format
  const posters = (movie.allPosters || []).map(p => {
    if (typeof p === 'string') {
      return { url: p, lang: 'en', isEnglish: true };
    }
    return p;
  });
  
  const englishPosters = posters.filter(p => p.isEnglish);
  const intlPosters = posters.filter(p => !p.isEnglish);
  const hasIntl = intlPosters.length > 0;
  const currentPoster = movie.customPosterUrl || movie.posterUrl;
  
  const picker = document.createElement('div');
  picker.className = 'poster-picker-modal';
  picker.innerHTML = `
    <div class="poster-picker-content">
      <div class="poster-picker-header">
        <h3>Choose poster for "${movie.title}"</h3>
        <button class="poster-picker-close">×</button>
      </div>
      
      <!-- Custom URL Section -->
      <div class="custom-poster-section">
        <div class="custom-poster-input-row">
          <input 
            type="text" 
            id="custom-poster-url" 
            placeholder="Paste custom image URL (.jpg, .png, .webp)"
            value="${movie.customPosterUrl || ''}"
          />
          <button id="apply-custom-poster" class="btn-small btn-primary">Apply</button>
        </div>
        ${movie.customPosterUrl ? `
          <button id="remove-custom-poster" class="btn-small btn-danger">Remove custom poster</button>
        ` : ''}
        <p id="custom-poster-error" class="custom-poster-error"></p>
      </div>
      
      ${posters.length > 0 ? `
        <div class="poster-filter-tabs">
          <button class="poster-filter-btn active" data-filter="english">
            🇺🇸 English (${englishPosters.length})
          </button>
          ${hasIntl ? `
            <button class="poster-filter-btn" data-filter="international">
              🌍 International (${intlPosters.length})
            </button>
          ` : ''}
        </div>
        <div class="poster-picker-grid" id="poster-grid">
          ${renderPosterOptions(englishPosters.length > 0 ? englishPosters : intlPosters, currentPoster)}
        </div>
      ` : ''}
    </div>
  `;
  
  document.body.appendChild(picker);
  
  // Custom poster URL handling
  const customInput = picker.querySelector('#custom-poster-url');
  const applyBtn = picker.querySelector('#apply-custom-poster');
  const removeBtn = picker.querySelector('#remove-custom-poster');
  const errorEl = picker.querySelector('#custom-poster-error');
  
  applyBtn?.addEventListener('click', async () => {
    const url = customInput.value.trim();
    if (!url) {
      errorEl.textContent = 'Please enter a URL';
      return;
    }
    
    // Validate URL format
    if (!isValidImageUrl(url)) {
      errorEl.textContent = 'Invalid URL. Use .jpg, .png, or .webp images only.';
      return;
    }
    
    applyBtn.disabled = true;
    applyBtn.textContent = 'Checking...';
    errorEl.textContent = '';
    
    // Validate image loads
    const isValid = await validateImageUrl(url);
    
    if (isValid) {
      movie.customPosterUrl = url;
      renderMoviesGrid();
      showSuccess('Custom poster applied!');
      closePosterPicker();
    } else {
      errorEl.textContent = 'Could not load image. Check the URL or try another.';
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply';
    }
  });
  
  removeBtn?.addEventListener('click', () => {
    movie.customPosterUrl = null;
    renderMoviesGrid();
    showSuccess('Custom poster removed');
    closePosterPicker();
  });
  
  // Filter tab switching
  if (posters.length > 0) {
    picker.querySelectorAll('.poster-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        picker.querySelectorAll('.poster-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        const grid = picker.querySelector('#poster-grid');
        const displayPosters = filter === 'english' ? englishPosters : intlPosters;
        grid.innerHTML = renderPosterOptions(displayPosters, currentPoster);
        
        // Re-attach click handlers
        attachPosterClickHandlers(picker, movie);
      });
    });
  }
  
  // Close handlers
  picker.querySelector('.poster-picker-close').addEventListener('click', closePosterPicker);
  picker.addEventListener('click', (e) => {
    if (e.target === picker) closePosterPicker();
  });
  
  // Poster selection
  attachPosterClickHandlers(picker, movie);
  
  document.addEventListener('keydown', handleEscapeKey);
}

function renderPosterOptions(posters, currentUrl) {
  return posters.map((p, index) => {
    const url = typeof p === 'string' ? p : p.url;
    const lang = typeof p === 'string' ? '' : (p.lang && p.lang !== 'en' ? p.lang.toUpperCase() : '');
    return `
      <div class="poster-option ${url === currentUrl ? 'selected' : ''}" data-url="${url}">
        <img src="${url}" alt="Poster ${index + 1}" crossorigin="anonymous" loading="lazy" />
        ${url === currentUrl ? '<span class="current-badge">Current</span>' : ''}
        ${lang ? `<span class="lang-badge">${lang}</span>` : ''}
      </div>
    `;
  }).join('');
}

function attachPosterClickHandlers(picker, movie) {
  picker.querySelectorAll('.poster-option').forEach(option => {
    option.addEventListener('click', () => {
      const newUrl = option.dataset.url;
      if (newUrl !== movie.posterUrl) {
        movie.posterUrl = newUrl;
        renderMoviesGrid();
        showSuccess('Poster updated!');
      }
      closePosterPicker();
    });
  });
}

function closePosterPicker() {
  const picker = document.querySelector('.poster-picker-modal');
  if (picker) picker.remove();
  document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closePosterPicker();
    closePanel();
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

// Apply dynamic scaling based on movie count (Layer 2)
function applyDynamicScaling() {
  const exportArea = document.getElementById('export-area');
  const count = movies.length;
  
  // Remove all scale classes
  exportArea.classList.remove('scale-medium', 'scale-compact', 'scale-ultra');
  
  // Apply appropriate scale class based on count
  if (count > 100) {
    exportArea.classList.add('scale-ultra');
  } else if (count > 60) {
    exportArea.classList.add('scale-compact');
  } else if (count > 30) {
    exportArea.classList.add('scale-medium');
  }
  // Default (≤30): no scale class needed
}

function renderMoviesGrid() {
  moviesGrid.innerHTML = '';
  sortMoviesByDate();
  
  // Apply dynamic scaling based on count
  applyDynamicScaling();
  
  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, index);
    moviesGrid.appendChild(card);
  });
  
  // Update export visibility
  if (typeof updateExportVisibility === 'function') {
    updateExportVisibility();
  }
}

function updateMovieCount() {
  const count = movies.length;
  movieCount.textContent = getExportSubtitle();
  monthTitle.textContent = getExportTitle();
  
  if (movieListCount) movieListCount.textContent = count;
  if (headerMovieCount) headerMovieCount.textContent = count;
}

function renderCalendarView() {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
  
  // Group movies by day
  const moviesByDay = {};
  movies.forEach(movie => {
    if (movie.watchedDate) {
      let movieMonth, movieYear, movieDay;
      
      if (typeof movie.watchedDate === 'string' && movie.watchedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = movie.watchedDate.split('-').map(Number);
        movieYear = y;
        movieMonth = m - 1;
        movieDay = d;
      } else {
        const date = new Date(movie.watchedDate);
        movieYear = date.getFullYear();
        movieMonth = date.getMonth();
        movieDay = date.getDate();
      }
      
      if (movieMonth === selectedMonth && movieYear === selectedYear) {
        if (!moviesByDay[movieDay]) moviesByDay[movieDay] = [];
        moviesByDay[movieDay].push(movie);
      }
    }
  });
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let html = `
    <div class="calendar-header">
      ${dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid">
  `;
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayMovies = moviesByDay[day] || [];
    const hasMovies = dayMovies.length > 0;
    const isToday = today.getDate() === day && 
                    today.getMonth() === selectedMonth && 
                    today.getFullYear() === selectedYear;
    
    let moviesHtml = '';
    if (hasMovies) {
      const visibleMovies = dayMovies.slice(0, 3);
      const remainingCount = dayMovies.length - 3;
      
      moviesHtml = visibleMovies.map(m => `
        <div class="calendar-movie-thumb" title="${m.title}">
          <img src="${m.posterUrl}" alt="${m.title}" crossorigin="anonymous">
        </div>
      `).join('');
      
      if (remainingCount > 0) {
        moviesHtml += `<div class="calendar-movie-count">+${remainingCount}</div>`;
      }
    }
    
    html += `
      <div class="calendar-day ${hasMovies ? 'has-movies' : ''} ${isToday ? 'today' : ''}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-day-movies">${moviesHtml}</div>
      </div>
    `;
  }
  
  html += '</div>';
  calendarView.innerHTML = html;
}

function switchView(view) {
  currentView = view;
  
  gridViewBtn.classList.toggle('active', view === 'grid');
  calendarViewBtn.classList.toggle('active', view === 'calendar');
  
  if (view === 'grid') {
    moviesGrid.style.display = 'grid';
    calendarView.style.display = 'none';
  } else {
    moviesGrid.style.display = 'none';
    calendarView.style.display = 'block';
    renderCalendarView();
  }
}

function renderMovieList() {
  movieListItems.innerHTML = '';
  sortMoviesByDate();
  
  movies.forEach((movie, index) => {
    const li = document.createElement('li');
    const stars = ratingToStars(movie.rating);
    const rewatchBadge = movie.rewatch ? '<span class="movie-rewatch">↻</span>' : '';
    const datePart = movie.watchedDate ? ` • ${formatDateBadge(movie.watchedDate)}` : '';
    const watchIndexBadge = (movie.watchIndex && movie.watchIndex > 1) 
      ? `<span class="movie-watch-index">x${movie.watchIndex}</span>` 
      : '';
    
    li.innerHTML = `
      <div class="movie-info">
        <span class="movie-title">${movie.title} (${movie.year})${datePart}${watchIndexBadge}</span>
        <span class="movie-rating">${stars}${rewatchBadge}</span>
      </div>
      ${!isComplete ? `<button class="remove-btn" data-index="${index}" title="Remove">×</button>` : ''}
    `;
    
    movieListItems.appendChild(li);
  });
  
  if (!isComplete) {
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        removeMovie(index);
      });
    });
  }
}

function removeMovie(index) {
  const removed = movies.splice(index, 1)[0];
  renderMoviesGrid();
  renderMovieList();
  updateMovieCount();
  if (currentView === 'calendar') renderCalendarView();
  showSuccess(`Removed "${removed.title}"`);
}

// ============================================
// CLEAR ALL MOVIES
// ============================================

function clearAllMovies() {
  if (movies.length === 0) {
    showError('No movies to clear');
    return;
  }
  
  if (!confirm(`Clear all ${movies.length} movies?`)) return;
  
  movies = [];
  isComplete = false;
  currentListData = null; // Reset list data
  currentImportMode = 'diary';
  letterboxdUsername = null;
  
  // Re-enable all inputs
  [monthSelect, yearSelect, movieInput, yearInput, ratingSelect, 
   rewatchCheckbox, showDatesCheckbox, watchDateInput, addMovieBtn, 
   completeBtn, letterboxdUrl, importDiaryBtn, importListBtn, clearMoviesBtn].forEach(el => {
    if (el) el.disabled = false;
  });
  
  downloadBtn.style.display = 'none';
  if (fabDownload) fabDownload.style.display = 'none';
  if (listSortOptions) listSortOptions.style.display = 'none';
  if (attributionToggle) attributionToggle.style.display = 'none';
  if (document.getElementById('export-csv-section')) {
    document.getElementById('export-csv-section').style.display = 'none';
  }
  
  renderMoviesGrid();
  renderMovieList();
  updateMovieCount();
  if (currentView === 'calendar') renderCalendarView();
  
  showSuccess('All movies cleared');
}

clearMoviesBtn?.addEventListener('click', clearAllMovies);

// ============================================
// LETTERBOXD IMPORT (with Pagination Support)
// ============================================

function parseLetterboxdUrl(url) {
  const patterns = [
    /letterboxd\.com\/([^\/]+)\/?$/,
    /letterboxd\.com\/([^\/]+)\/films/,
    /letterboxd\.com\/([^\/]+)\/list/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  if (/^[a-zA-Z0-9_]+$/.test(url.trim())) {
    return url.trim();
  }
  
  return null;
}

function parseSelectedMonth() {
  const month = String(selectedMonth + 1).padStart(2, '0');
  const year = String(selectedYear);
  return { month, year };
}

// Fetch a single diary page HTML
async function fetchDiaryPage(username, year, month, page = 1) {
  const diaryUrl = `https://letterboxd.com/${username}/films/diary/${year}/${month}/page/${page}/`;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(diaryUrl);
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const html = await response.text();
        if (html && html.includes('diary-entry-row')) {
          return html;
        }
      }
    } catch (error) {
      console.warn(`Proxy failed for page ${page}:`, error.message);
    }
  }
  return null;
}

// Parse diary entries from HTML page
function parseDiaryPageHTML(html, targetYear, targetMonth) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('tr.diary-entry-row');
  const entries = [];
  
  rows.forEach(row => {
    try {
      // Get film title
      const titleEl = row.querySelector('td.td-film-details h3.headline-3 a');
      const title = titleEl ? titleEl.textContent.trim() : null;
      if (!title) return;
      
      // Get release year
      const yearEl = row.querySelector('td.td-film-details .metadata span');
      const year = yearEl ? parseInt(yearEl.textContent) : null;
      
      // Get watched date
      const dateLink = row.querySelector('td.td-day a');
      const monthLink = row.querySelector('td.td-calendar a[href*="/diary/"]');
      
      let watchedDate = null;
      if (dateLink && monthLink) {
        const day = dateLink.textContent.trim();
        // Extract month/year from the href
        const hrefMatch = monthLink.getAttribute('href')?.match(/\/diary\/(\d{4})\/(\d{2})\//);
        if (hrefMatch) {
          const [, y, m] = hrefMatch;
          watchedDate = `${y}-${m}-${day.padStart(2, '0')}`;
        }
      }
      
      // Validate month/year
      if (watchedDate) {
        const [wy, wm] = watchedDate.split('-').map(Number);
        if (wy !== targetYear || wm !== targetMonth) return;
      }
      
      // Get rating
      const ratingEl = row.querySelector('td.td-rating .rating');
      let rating = 3;
      if (ratingEl) {
        const ratingClass = Array.from(ratingEl.classList).find(c => c.startsWith('rated-'));
        if (ratingClass) {
          rating = parseInt(ratingClass.replace('rated-', '')) / 2;
        }
      }
      
      // Check for rewatch
      const rewatchEl = row.querySelector('td.td-rewatch .icon-rewatch');
      const rewatch = !!rewatchEl;
      
      entries.push({ title, year, rating, rewatch, watchedDate });
    } catch (e) {
      console.warn('Failed to parse diary row:', e);
    }
  });
  
  return entries;
}

// Check if there are more pages
function hasMorePages(html) {
  return html && html.includes('paginate-nextprev') && html.includes('next');
}

// Fetch all diary entries with pagination (Layer 1)
async function fetchLetterboxdDiaryPaginated(username, year, month) {
  const allEntries = [];
  let page = 1;
  const maxPages = 10; // Safety limit (10 pages = ~500 entries max)
  
  updateProgress(10, `Fetching diary page 1...`);
  
  while (page <= maxPages) {
    const html = await fetchDiaryPage(username, year, month, page);
    
    if (!html) {
      if (page === 1) {
        // First page failed, fall back to RSS
        console.log('Diary pages unavailable, falling back to RSS...');
        return null;
      }
      break;
    }
    
    const entries = parseDiaryPageHTML(html, parseInt(year), parseInt(month));
    console.log(`Page ${page}: found ${entries.length} entries`);
    
    if (entries.length === 0) break;
    
    allEntries.push(...entries);
    updateProgress(10 + (page * 5), `Found ${allEntries.length} movies (page ${page})...`);
    
    if (!hasMorePages(html) || entries.length < 50) break;
    
    page++;
    await new Promise(r => setTimeout(r, 300)); // Rate limit
  }
  
  return allEntries;
}

// Original RSS fetch (fallback)
async function fetchLetterboxdDiaryRSS(username, year, month) {
  const rssUrl = `https://letterboxd.com/${username}/rss/`;
  
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    try {
      const proxyUrl = proxy + encodeURIComponent(rssUrl);
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const xml = await response.text();
        if (xml && xml.includes('<item>') && xml.includes('letterboxd')) {
          return { xml, targetMonth: month, targetYear: year };
        }
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error.message);
    }
  }
  
  return null;
}

// Main fetch function - tries pagination first, falls back to RSS
async function fetchLetterboxdDiary(username, year, month) {
  updateProgress(5, `Connecting to Letterboxd...`);
  
  // Try paginated diary fetch first (supports 100+ movies)
  const paginatedEntries = await fetchLetterboxdDiaryPaginated(username, year, month);
  
  if (paginatedEntries && paginatedEntries.length > 0) {
    console.log(`Pagination successful: ${paginatedEntries.length} entries`);
    return { entries: paginatedEntries, source: 'pagination' };
  }
  
  // Fallback to RSS (limited to ~50 entries)
  console.log('Falling back to RSS feed...');
  updateProgress(15, `Fetching RSS feed...`);
  
  const rssData = await fetchLetterboxdDiaryRSS(username, year, month);
  
  if (rssData) {
    return { ...rssData, source: 'rss' };
  }
  
  throw new Error(`Could not fetch data for "${username}". Check the username and try again.`);
}

function parseLetterboxdRSS(xml, targetMonth, targetYear) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  const diaryEntries = [];
  
  const targetMonthNum = parseInt(targetMonth);
  const targetYearNum = parseInt(targetYear);
  
  items.forEach(item => {
    try {
      const entry = parseRSSItem(item, targetMonthNum, targetYearNum);
      if (entry) diaryEntries.push(entry);
    } catch (e) {
      console.warn('Failed to parse RSS item:', e);
    }
  });
  
  return diaryEntries;
}

function parseRSSItem(item, targetMonth, targetYear) {
  const watchedDateEl = item.getElementsByTagName('letterboxd:watchedDate')[0];
  if (!watchedDateEl) return null;
  
  const watchedDate = watchedDateEl.textContent;
  const [itemYear, itemMonth] = watchedDate.split('-').map(Number);
  
  if (itemYear !== targetYear || itemMonth !== targetMonth) return null;
  
  const filmTitleEl = item.getElementsByTagName('letterboxd:filmTitle')[0];
  const title = filmTitleEl ? filmTitleEl.textContent : null;
  if (!title) return null;
  
  const filmYearEl = item.getElementsByTagName('letterboxd:filmYear')[0];
  const year = filmYearEl ? parseInt(filmYearEl.textContent) : null;
  
  const ratingEl = item.getElementsByTagName('letterboxd:memberRating')[0];
  let rating = 3;
  if (ratingEl) {
    const ratingValue = parseFloat(ratingEl.textContent);
    if (!isNaN(ratingValue)) rating = ratingValue;
  }
  
  const rewatchEl = item.getElementsByTagName('letterboxd:rewatch')[0];
  const isRewatch = rewatchEl ? rewatchEl.textContent === 'Yes' : false;
  
  return { title, year, rating, rewatch: isRewatch, watchedDate };
}

function updateProgress(percent, text) {
  progressFill.style.width = `${percent}%`;
  progressText.textContent = text;
}

async function importFromLetterboxd() {
  const urlInput = letterboxdUrl.value.trim();
  
  if (!urlInput) {
    showError('Enter your Letterboxd username');
    return;
  }
  
  const username = parseLetterboxdUrl(urlInput);
  if (!username) {
    showError('Invalid username or URL');
    return;
  }
  
  const { month, year } = parseSelectedMonth();
  
  importProgress.style.display = 'block';
  importDiaryBtn.disabled = true;
  importDiaryBtn.innerHTML = '<span class="btn-icon">⏳</span> Importing...';
  
  try {
    updateProgress(10, `Fetching diary for ${getSelectedMonthDisplay()}...`);
    const fetchResult = await fetchLetterboxdDiary(username, year, month);
    
    let diaryEntries;
    
    if (fetchResult.source === 'pagination') {
      // Direct entries from paginated fetch
      diaryEntries = fetchResult.entries;
      console.log(`Using pagination: ${diaryEntries.length} entries`);
    } else {
      // Parse RSS feed
      updateProgress(30, 'Parsing RSS entries...');
      diaryEntries = parseLetterboxdRSS(fetchResult.xml, fetchResult.targetMonth, fetchResult.targetYear);
      console.log(`Using RSS: ${diaryEntries.length} entries`);
    }
    
    if (diaryEntries.length === 0) {
      showError(`No entries found for ${getSelectedMonthDisplay()}`);
      return;
    }
    
    updateProgress(40, `Found ${diaryEntries.length} movies. Fetching posters...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < diaryEntries.length; i++) {
      const entry = diaryEntries[i];
      const progress = 40 + ((i + 1) / diaryEntries.length) * 55;
      updateProgress(progress, `${entry.title} (${i + 1}/${diaryEntries.length})`);
      
      try {
        const movieData = await searchMovie(entry.title, entry.year);
        
        if (movieData && movieData.poster_path) {
          const posterUrl = getPosterUrl(movieData.poster_path);
          const allPosters = await fetchMoviePosters(movieData.id);
          
          if (!allPosters.includes(posterUrl)) {
            allPosters.unshift(posterUrl);
          }
          
          movies.push({
            id: Date.now() + i,
            tmdbId: movieData.id,
            title: movieData.title,
            year: new Date(movieData.release_date).getFullYear() || entry.year || 'N/A',
            posterUrl,
            allPosters,
            rating: entry.rating,
            rewatch: entry.rewatch,
            watchedDate: entry.watchedDate
          });
          
          successCount++;
        } else {
          failCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (e) {
        failCount++;
        console.warn(`Failed to fetch: ${entry.title}`, e);
      }
    }
    
    updateProgress(100, 'Done!');
    
    renderMoviesGrid();
    renderMovieList();
    updateMovieCount();
    if (currentView === 'calendar') renderCalendarView();
    
    // Store username for attribution and show toggle
    letterboxdUsername = username;
    if (attributionToggle) {
      attributionToggle.style.display = 'block';
    }
    
    let message = `Imported ${successCount} movies`;
    if (failCount > 0) message += ` (${failCount} not found)`;
    showSuccess(message);
    
  } catch (error) {
    showError(error.message);
    console.error('Import error:', error);
  } finally {
    setTimeout(() => {
      importProgress.style.display = 'none';
      progressFill.style.width = '0%';
    }, 2000);
    
    importDiaryBtn.disabled = false;
    importDiaryBtn.innerHTML = '<span class="btn-icon">📥</span> Import Month\'s Diary';
  }
}

importDiaryBtn?.addEventListener('click', importFromLetterboxd);

// ============================================
// LETTERBOXD LISTS IMPORT
// ============================================

// Import mode tab switching
document.querySelectorAll('.import-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.import-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const mode = btn.dataset.mode;
    currentImportMode = mode;
    
    if (mode === 'diary') {
      diaryModeContent?.classList.add('active');
      listModeContent?.classList.remove('active');
    } else {
      diaryModeContent?.classList.remove('active');
      listModeContent?.classList.add('active');
    }
  });
});

function parseListUrl(url) {
  // Extract list path from Letterboxd list URL
  const patterns = [
    /letterboxd\.com\/([^\/]+)\/list\/([^\/]+)/,
    /letterboxd\.com\/([^\/]+)\/watchlist/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const username = match[1];
      const listSlug = match[2] || 'watchlist';
      return { username, listSlug, isWatchlist: !match[2] };
    }
  }
  
  // Handle boxd.it short URLs (e.g., https://boxd.it/nVqt6)
  const shortUrlMatch = url.match(/boxd\.it\/([a-zA-Z0-9]+)/);
  if (shortUrlMatch) {
    return { shortCode: shortUrlMatch[1], isShortUrl: true };
  }
  
  return null;
}

async function fetchLetterboxdList(listInfo) {
  let listUrl;
  
  // Handle boxd.it short URLs
  if (listInfo.isShortUrl) {
    listUrl = `https://boxd.it/${listInfo.shortCode}`;
  } else if (listInfo.isWatchlist) {
    listUrl = `https://letterboxd.com/${listInfo.username}/watchlist/`;
  } else {
    listUrl = `https://letterboxd.com/${listInfo.username}/list/${listInfo.listSlug}/`;
  }
  
  updateProgress(10, 'Fetching list...');
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(listUrl);
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const html = await response.text();
        if (html && (html.includes('poster-container') || html.includes('film-poster'))) {
          // For short URLs, extract username from the HTML
          let username = listInfo.username;
          if (listInfo.isShortUrl) {
            const usernameMatch = html.match(/letterboxd\.com\/([^\/]+)\/list\//);
            username = usernameMatch ? usernameMatch[1] : 'unknown';
          }
          return { html, username, listSlug: listInfo.listSlug };
        }
      }
    } catch (error) {
      console.warn('List fetch failed:', error.message);
    }
  }
  
  throw new Error('Could not fetch list. Make sure the URL is correct and the list is public.');
}

function parseListHTML(html, username) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Get list title
  const titleEl = doc.querySelector('h1.title-1, .list-title-intro h1');
  const listTitle = titleEl ? titleEl.textContent.trim() : 'Letterboxd List';
  
  // Get list description (optional)
  const descEl = doc.querySelector('.list-title-intro .body-text');
  const listDescription = descEl ? descEl.textContent.trim() : null;
  
  // Parse movies from list
  const listEntries = [];
  const filmPosters = doc.querySelectorAll('.poster-container, li.poster-container, .film-poster');
  
  filmPosters.forEach((poster, index) => {
    try {
      // Get film data from poster element
      const filmEl = poster.querySelector('[data-film-slug]') || poster;
      const filmSlug = filmEl.dataset?.filmSlug || filmEl.getAttribute('data-film-slug');
      const filmName = filmEl.dataset?.filmName || filmEl.getAttribute('data-film-name');
      
      // Try getting from img alt as fallback
      const img = poster.querySelector('img');
      const altName = img?.alt;
      
      const title = filmName || altName;
      if (!title) return;
      
      // Get year if available
      const yearEl = poster.querySelector('.film-year, .metadata');
      const year = yearEl ? parseInt(yearEl.textContent) : null;
      
      // Get average rating from Letterboxd if available
      const ratingEl = poster.querySelector('.average-rating, [data-average-rating]');
      let avgRating = null;
      if (ratingEl) {
        avgRating = parseFloat(ratingEl.dataset?.averageRating || ratingEl.textContent);
      }
      
      listEntries.push({
        title,
        year,
        avgRating,
        listIndex: index,
        slug: filmSlug
      });
    } catch (e) {
      console.warn('Failed to parse list item:', e);
    }
  });
  
  return {
    title: listTitle,
    description: listDescription,
    creator: username,
    movies: listEntries
  };
}

function sortListMovies(sortBy) {
  if (!currentListData || movies.length === 0) return;
  
  switch (sortBy) {
    case 'original':
      // Restore original order
      movies.sort((a, b) => (a.listIndex || 0) - (b.listIndex || 0));
      break;
    case 'rating-high':
      movies.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      break;
    case 'rating-low':
      movies.sort((a, b) => (a.avgRating || 0) - (b.avgRating || 0));
      break;
    case 'year-new':
      movies.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case 'year-old':
      movies.sort((a, b) => (a.year || 0) - (b.year || 0));
      break;
    case 'alpha':
      movies.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  
  renderMoviesGrid();
  renderMovieList();
}

listSortSelect?.addEventListener('change', (e) => {
  sortListMovies(e.target.value);
});

async function importFromList() {
  const urlInput = listUrlInput?.value.trim();
  
  if (!urlInput) {
    showError('Enter a Letterboxd list URL');
    return;
  }
  
  const listInfo = parseListUrl(urlInput);
  if (!listInfo) {
    showError('Invalid list URL. Use format: letterboxd.com/user/list/list-name/ or boxd.it/xxxxx');
    return;
  }
  
  importProgress.style.display = 'block';
  importListBtn.disabled = true;
  importListBtn.innerHTML = '<span class="btn-icon">⏳</span> Importing...';
  
  try {
    const { html, username } = await fetchLetterboxdList(listInfo);
    
    updateProgress(25, 'Parsing list...');
    const listData = parseListHTML(html, username);
    
    if (listData.movies.length === 0) {
      showError('No movies found in this list');
      return;
    }
    
    currentListData = listData;
    currentImportMode = 'list';
    
    // Clear existing movies
    movies = [];
    
    updateProgress(35, `Found ${listData.movies.length} movies. Fetching posters...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < listData.movies.length; i++) {
      const entry = listData.movies[i];
      const progress = 35 + ((i + 1) / listData.movies.length) * 60;
      updateProgress(progress, `${entry.title} (${i + 1}/${listData.movies.length})`);
      
      try {
        const movieData = await searchMovie(entry.title, entry.year);
        
        if (movieData && movieData.poster_path) {
          const posterUrl = getPosterUrl(movieData.poster_path);
          const allPosters = await fetchMoviePosters(movieData.id);
          
          if (!allPosters.find(p => (typeof p === 'string' ? p : p.url) === posterUrl)) {
            allPosters.unshift({ url: posterUrl, lang: 'en', isEnglish: true });
          }
          
          movies.push({
            id: Date.now() + i,
            tmdbId: movieData.id,
            title: movieData.title,
            year: new Date(movieData.release_date).getFullYear() || entry.year || 'N/A',
            posterUrl,
            allPosters,
            rating: entry.avgRating, // Use Letterboxd average rating
            avgRating: entry.avgRating,
            rewatch: false,
            listIndex: entry.listIndex,
            watchedDate: null
          });
          
          successCount++;
        } else {
          failCount++;
        }
        
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        failCount++;
        console.warn(`Failed to fetch: ${entry.title}`, e);
      }
    }
    
    updateProgress(100, 'Complete!');
    
    // Update header for list mode
    monthTitle.textContent = listData.title;
    movieCount.textContent = `${successCount} film${successCount !== 1 ? 's' : ''} • by ${listData.creator}`;
    
    // Show sort options and export
    if (listSortOptions) {
      listSortOptions.style.display = 'block';
      listSortSelect.value = 'original';
    }
    
    // Show export CSV section
    if (exportCsvSection) {
      exportCsvSection.style.display = 'block';
    }
    
    // Show attribution toggle
    if (attributionToggle) {
      attributionToggle.style.display = 'block';
    }
    
    renderMoviesGrid();
    renderMovieList();
    
    let message = `Imported ${successCount} movies from "${listData.title}"`;
    if (failCount > 0) message += ` (${failCount} not found)`;
    showSuccess(message);
    
  } catch (error) {
    showError(error.message);
    console.error('List import error:', error);
  } finally {
    setTimeout(() => {
      importProgress.style.display = 'none';
      progressFill.style.width = '0%';
    }, 2000);
    
    importListBtn.disabled = false;
    importListBtn.innerHTML = '<span class="btn-icon">📥</span> Import List';
  }
}

importListBtn?.addEventListener('click', importFromList);

// ============================================
// CUSTOM LIST CREATION & EXPORT
// ============================================

const createListBtn = document.getElementById('create-list-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportCsvSection = document.getElementById('export-csv-section');

function openCreateListModal() {
  // Remove existing modal if any
  closeCreateListModal();
  
  const modal = document.createElement('div');
  modal.className = 'create-list-modal';
  modal.id = 'create-list-modal';
  modal.innerHTML = `
    <div class="create-list-content">
      <div class="create-list-header">
        <h3>Create New List</h3>
        <button class="poster-picker-close" id="close-create-modal">×</button>
      </div>
      <div class="create-list-body">
        <div class="control-group">
          <label for="new-list-title">List Title *</label>
          <input type="text" id="new-list-title" placeholder="e.g., My Favorite Films">
        </div>
        <div class="control-group">
          <label for="new-list-desc">Description (optional)</label>
          <textarea id="new-list-desc" placeholder="What's this list about?"></textarea>
        </div>
      </div>
      <div class="create-list-footer">
        <button class="btn btn-secondary" id="cancel-create-list">Cancel</button>
        <button class="btn btn-primary" id="confirm-create-list">Create List</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus the title input
  setTimeout(() => {
    document.getElementById('new-list-title')?.focus();
  }, 100);
  
  // Event listeners
  document.getElementById('close-create-modal')?.addEventListener('click', closeCreateListModal);
  document.getElementById('cancel-create-list')?.addEventListener('click', closeCreateListModal);
  document.getElementById('confirm-create-list')?.addEventListener('click', confirmCreateList);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCreateListModal();
  });
  
  // Enter key to submit
  document.getElementById('new-list-title')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmCreateList();
  });
}

function closeCreateListModal() {
  const modal = document.getElementById('create-list-modal');
  if (modal) modal.remove();
}

function confirmCreateList() {
  const titleInput = document.getElementById('new-list-title');
  const descInput = document.getElementById('new-list-desc');
  
  const title = titleInput?.value.trim();
  const description = descInput?.value.trim();
  
  if (!title) {
    showError('Please enter a list title');
    titleInput?.focus();
    return;
  }
  
  // Create list data
  currentListData = {
    title,
    description,
    creator: 'You',
    isCustom: true,
    createdAt: new Date().toISOString()
  };
  
  currentImportMode = 'list';
  
  // Clear any existing movies
  movies = [];
  
  // Update header
  monthTitle.textContent = title;
  movieCount.textContent = '0 films • Add movies below';
  
  // Show export section
  if (exportCsvSection) exportCsvSection.style.display = 'block';
  if (listSortOptions) listSortOptions.style.display = 'block';
  if (attributionToggle) attributionToggle.style.display = 'none'; // No attribution for custom lists
  
  renderMoviesGrid();
  renderMovieList();
  
  closeCreateListModal();
  showSuccess(`Created list "${title}". Now add movies!`);
}

createListBtn?.addEventListener('click', openCreateListModal);

// ============================================
// EXPORT TO LETTERBOXD (CSV)
// ============================================

function generateLetterboxdCSV() {
  if (movies.length === 0) {
    showError('No movies to export');
    return null;
  }
  
  // Validate movies have required data
  const invalidMovies = movies.filter(m => !m.title || !m.year);
  if (invalidMovies.length > 0) {
    console.warn('Some movies missing data:', invalidMovies);
  }
  
  // CSV Header
  let csv = 'Title,Year\n';
  
  // Track seen movies to avoid duplicates (unless same movie watched on different dates)
  const seen = new Set();
  
  movies.forEach(movie => {
    const key = `${movie.title}-${movie.year}`;
    
    // Skip duplicates for list export (Letterboxd will dedupe anyway)
    if (seen.has(key)) return;
    seen.add(key);
    
    // Escape title if it contains commas or quotes
    let title = movie.title;
    if (title.includes(',') || title.includes('"')) {
      title = `"${title.replace(/"/g, '""')}"`;
    }
    
    csv += `${title},${movie.year || ''}\n`;
  });
  
  return csv;
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function exportToLetterboxd() {
  const csv = generateLetterboxdCSV();
  
  if (!csv) return;
  
  // Generate filename from list title or month
  const baseName = currentListData?.title || getSelectedMonthDisplay();
  const filename = `${baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-letterboxd.csv`;
  
  downloadCSV(csv, filename);
  
  const movieCount = movies.length;
  const uniqueCount = new Set(movies.map(m => `${m.title}-${m.year}`)).size;
  
  let message = `Exported ${uniqueCount} movies`;
  if (uniqueCount < movieCount) {
    message += ` (${movieCount - uniqueCount} duplicates removed)`;
  }
  
  showSuccess(message);
}

exportCsvBtn?.addEventListener('click', exportToLetterboxd);

// Show export button when movies exist
function updateExportVisibility() {
  if (exportCsvSection && movies.length > 0 && (currentImportMode === 'list' || currentListData)) {
    exportCsvSection.style.display = 'block';
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

// Month/Year selection
monthSelect?.addEventListener('change', (e) => {
  selectedMonth = parseInt(e.target.value);
  updateMonthDisplay();
});

yearSelect?.addEventListener('change', (e) => {
  selectedYear = parseInt(e.target.value);
  updateMonthDisplay();
});

function updateMonthDisplay() {
  monthTitle.textContent = getSelectedMonthDisplay();
  updateWatchDateDefault();
  if (currentView === 'calendar') renderCalendarView();
}

function updateWatchDateDefault() {
  const defaultDate = new Date(selectedYear, selectedMonth, 1);
  const dateStr = defaultDate.toISOString().split('T')[0];
  if (watchDateInput) watchDateInput.value = dateStr;
}

// View toggle
gridViewBtn?.addEventListener('click', () => switchView('grid'));
calendarViewBtn?.addEventListener('click', () => switchView('calendar'));

// Show dates toggle
showDatesCheckbox?.addEventListener('change', (e) => {
  showDatesOnPosters = e.target.checked;
  renderMoviesGrid();
});

// Show ratings toggle
showRatingsCheckbox?.addEventListener('change', (e) => {
  showStarRatings = e.target.checked;
  renderMoviesGrid();
});

// Show attribution toggle
showAttributionCheckbox?.addEventListener('change', (e) => {
  showLetterboxdAttribution = e.target.checked;
});

// Add Movie
addMovieBtn?.addEventListener('click', async () => {
  const title = movieInput.value.trim();
  const year = yearInput.value ? parseInt(yearInput.value) : null;
  const rating = parseFloat(ratingSelect.value);
  const rewatch = rewatchCheckbox.checked;
  const watchedDate = watchDateInput.value || null;
  
  if (!title) {
    showError('Enter a movie title');
    return;
  }
  
  addMovieBtn.disabled = true;
  addMovieBtn.innerHTML = '<span class="btn-icon">⏳</span> Searching...';
  
  try {
    const movieData = await searchMovie(title, year);
    
    if (!movieData) {
      showError(`No movie found for "${title}"`);
      return;
    }
    
    if (!movieData.poster_path) {
      showError(`No poster for "${movieData.title}"`);
      return;
    }
    
    const posterUrl = getPosterUrl(movieData.poster_path);
    const allPosters = await fetchMoviePosters(movieData.id);
    
    if (!allPosters.includes(posterUrl)) {
      allPosters.unshift(posterUrl);
    }
    
    const movie = {
      id: Date.now(),
      tmdbId: movieData.id,
      title: movieData.title,
      year: new Date(movieData.release_date).getFullYear() || year || 'N/A',
      posterUrl,
      allPosters,
      rating,
      rewatch,
      watchedDate
    };
    
    movies.push(movie);
    
    movieInput.value = '';
    yearInput.value = '';
    rewatchCheckbox.checked = false;
    
    renderMoviesGrid();
    renderMovieList();
    updateMovieCount();
    if (currentView === 'calendar') renderCalendarView();
    
    showSuccess(`Added "${movie.title}"`);
    
    // Close panel on mobile after adding
    if (window.innerWidth < 1024) {
      setTimeout(closePanel, 500);
    }
    
  } catch (error) {
    showError('Failed to fetch movie');
    console.error(error);
  } finally {
    addMovieBtn.disabled = false;
    addMovieBtn.innerHTML = '<span class="btn-icon">+</span> Add Movie';
  }
});

// Enter key to add movie
movieInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addMovieBtn?.click();
});

// Complete Button
completeBtn?.addEventListener('click', () => {
  if (movies.length === 0) {
    showError('Add at least one movie');
    return;
  }
  
  isComplete = true;
  
  [monthSelect, yearSelect, movieInput, yearInput, ratingSelect, 
   rewatchCheckbox, showDatesCheckbox, watchDateInput, addMovieBtn, 
   completeBtn, letterboxdUrl, importDiaryBtn, clearMoviesBtn].forEach(el => {
    if (el) el.disabled = true;
  });
  
  downloadBtn.style.display = 'flex';
  if (fabDownload) fabDownload.style.display = 'flex';
  if (fabAdd) fabAdd.style.display = 'none';
  
  switchView('grid');
  renderMovieList();
  
  showSuccess('Ready to download your graphic!');
});

// Download PNG
downloadBtn?.addEventListener('click', downloadPNG);
fabDownload?.addEventListener('click', downloadPNG);

// Preload an image and return data URL
function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 500;
        canvas.height = img.naturalHeight || 750;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        console.warn('Canvas error for:', url, e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.warn('Failed to load:', url);
      resolve(null);
    };
    
    img.src = url;
  });
}

async function downloadPNG() {
  const btn = downloadBtn || fabDownload;
  if (!btn) return;
  
  btn.disabled = true;
  if (downloadBtn) downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Preparing...';
  
  const wasCalendarView = currentView === 'calendar';
  if (wasCalendarView) {
    switchView('grid');
    await new Promise(r => setTimeout(r, 100));
  }
  
  try {
    const totalMovies = movies.length;
    showToast(`Preparing ${totalMovies} posters for export...`, 'success');
    
    // Layer 3: Dynamic export settings based on count
    let gridColumns, gridGap, fontSize, badgeSize, exportWidth, canvasScale;
    
    if (totalMovies > 100) {
      // Ultra mode: 10 columns, smaller everything
      gridColumns = 10;
      gridGap = 8;
      fontSize = { title: 32, count: 14, stars: 10, badge: 7 };
      badgeSize = { padding: '1px 3px', top: 3 };
      exportWidth = 1400;
      canvasScale = 2;
    } else if (totalMovies > 60) {
      // Compact mode: 8 columns
      gridColumns = 8;
      gridGap = 12;
      fontSize = { title: 36, count: 16, stars: 11, badge: 8 };
      badgeSize = { padding: '2px 4px', top: 4 };
      exportWidth = 1300;
      canvasScale = 2;
    } else if (totalMovies > 30) {
      // Medium mode: 7 columns
      gridColumns = 7;
      gridGap = 16;
      fontSize = { title: 40, count: 17, stars: 12, badge: 9 };
      badgeSize = { padding: '2px 5px', top: 5 };
      exportWidth = 1250;
      canvasScale = 2;
    } else {
      // Default mode: 6 columns
      gridColumns = 6;
      gridGap = 20;
      fontSize = { title: 42, count: 18, stars: 14, badge: 10 };
      badgeSize = { padding: '3px 6px', top: 6 };
      exportWidth = 1200;
      canvasScale = 2;
    }
    
    // Step 1: Preload ALL movie poster images as data URLs (batched for large counts)
    const imageDataUrls = [];
    const batchSize = totalMovies > 50 ? 10 : 5;
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(batch.map(async (movie) => {
        // Use custom poster if set, otherwise default
        const posterToLoad = movie.customPosterUrl || movie.posterUrl;
        return await loadImageAsDataUrl(posterToLoad);
      }));
      
      // Fallback to default poster if custom fails
      imageDataUrls.push(...batchResults.map((url, idx) => {
        const movie = movies[i + idx];
        if (url) return url;
        // If custom poster failed, try default
        return movie.posterUrl;
      }));
      
      if (downloadBtn) {
        const loaded = Math.min(i + batchSize, totalMovies);
        downloadBtn.innerHTML = `<span class="btn-icon">⏳</span> ${loaded}/${totalMovies}`;
      }
      
      // Smaller delay for large batches
      await new Promise(r => setTimeout(r, totalMovies > 50 ? 50 : 100));
    }
    
    if (downloadBtn) downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Building...';
    
    // Step 2: Build a fresh export element with embedded images
    const exportClone = document.createElement('div');
    exportClone.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      background: #0c0f13;
      padding: 40px;
      width: ${exportWidth}px;
    `;
    
    // Header
    exportClone.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <h1 style="font-family: 'Outfit', sans-serif; font-size: ${fontSize.title}px; font-weight: 800; color: #f5f5f7; margin: 0 0 8px 0; letter-spacing: -1px;">${getExportTitle()}</h1>
        <p style="font-family: 'Outfit', sans-serif; font-size: ${fontSize.count}px; color: #a1a8b3; margin: 0;">${getExportSubtitle()}</p>
      </div>
      <div id="clone-grid" style="display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: ${gridGap}px;"></div>
    `;
    
    document.body.appendChild(exportClone);
    
    const grid = exportClone.querySelector('#clone-grid');
    
    // Add each movie card
    movies.forEach((movie, index) => {
      // Only show stars if rating exists AND toggle is on
      const hasRating = movie.rating !== null && movie.rating !== undefined;
      const stars = (showStarRatings && hasRating) ? ratingToStars(movie.rating) : '';
      const rewatchIcon = movie.rewatch ? '<span style="margin-left: 4px; color: #40bcf4;">↻</span>' : '';
      const starsContent = stars || (movie.rewatch ? rewatchIcon : '');
      
      const dateBadge = showDatesOnPosters && movie.watchedDate ? formatDateBadge(movie.watchedDate) : '';
      const rewatchBadge = movie.watchIndex > 1 ? `x${movie.watchIndex}` : '';
      
      const card = document.createElement('div');
      card.style.cssText = 'position: relative;';
      
      // Only show stars overlay if there's content
      const starsOverlay = starsContent ? `
        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 8px 6px; text-align: center; color: #00e054; font-family: 'Outfit', sans-serif; font-size: ${fontSize.stars}px; letter-spacing: 1px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);">
          ${stars}${movie.rewatch ? '<span style="margin-left: 4px; color: #40bcf4;">↻</span>' : ''}
        </div>
      ` : '';
      
      card.innerHTML = `
        <div style="position: relative; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; background: #13171c; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
          ${dateBadge ? `<div style="position: absolute; top: ${badgeSize.top}px; left: ${badgeSize.top}px; background: rgba(0,0,0,0.85); color: #f5f5f7; font-family: 'Outfit', sans-serif; font-size: ${fontSize.badge}px; font-weight: 600; padding: ${badgeSize.padding}; border-radius: 4px; z-index: 2;">${dateBadge}</div>` : ''}
          ${rewatchBadge ? `<div style="position: absolute; top: ${badgeSize.top}px; right: ${badgeSize.top}px; background: rgba(64,188,244,0.2); border: 1px solid #40bcf4; color: #40bcf4; font-family: 'Outfit', sans-serif; font-size: ${fontSize.badge}px; font-weight: 700; padding: ${badgeSize.padding}; border-radius: 4px; z-index: 3;">${rewatchBadge}</div>` : ''}
          <img src="${imageDataUrls[index]}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          ${starsOverlay}
        </div>
      `;
      
      grid.appendChild(card);
    });
    
    // Add Letterboxd attribution if enabled and username/list exists
    if (showLetterboxdAttribution && (letterboxdUsername || currentListData)) {
      const attribution = document.createElement('div');
      const displayName = currentListData ? currentListData.creator : letterboxdUsername;
      
      attribution.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
        padding-top: 16px;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        opacity: 0.7;
      `;
      
      // Letterboxd-style icon (three dots representing the logo)
      attribution.innerHTML = `
        <span style="display: flex; gap: 3px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #00e054;"></span>
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #40bcf4;"></span>
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #ff8000;"></span>
        </span>
        <span style="color: rgba(255,255,255,0.6); font-weight: 500;">${displayName}</span>
      `;
      
      exportClone.appendChild(attribution);
    }
    
    // Wait for inline images to render
    await new Promise(r => setTimeout(r, totalMovies > 50 ? 800 : 500));
    
    if (downloadBtn) downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Capturing...';
    
    // Step 3: Capture the clone
    const canvas = await html2canvas(exportClone, {
      backgroundColor: '#0c0f13',
      scale: canvasScale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 30000,
    });
    
    // Clean up clone
    document.body.removeChild(exportClone);
    
    // Step 4: Download
    const link = document.createElement('a');
    link.download = `${getExportTitle().replace(/\s+/g, '-')}-Movies.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showSuccess('PNG downloaded!');
    
  } catch (error) {
    showError('Export failed. Please try again.');
    console.error('Export error:', error);
  } finally {
    btn.disabled = false;
    if (downloadBtn) downloadBtn.innerHTML = '<span class="btn-icon">↓</span> Download PNG';
    if (wasCalendarView) switchView('calendar');
  }
}

// ============================================
// INITIALIZATION
// ============================================

function initYearSelector() {
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  
  for (let y = 2010; y <= currentYear + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
  
  selectedYear = currentYear;
}

function initMonthSelector() {
  const currentMonth = new Date().getMonth();
  monthSelect.value = currentMonth;
  selectedMonth = currentMonth;
}

function init() {
  initYearSelector();
  initMonthSelector();
  
  monthTitle.textContent = getSelectedMonthDisplay();
  updateMovieCount();
  updateWatchDateDefault();
  
  // On desktop, panel is always visible
  if (window.innerWidth >= 1024) {
    controlsPanel.classList.add('active');
  }
  
  // Handle resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      controlsPanel.classList.add('active');
      panelOverlay.classList.remove('active');
      document.body.classList.remove('panel-open');
    } else if (!isPanelOpen) {
      controlsPanel.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
