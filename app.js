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
let isPanelOpen = false;

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

// Checkbox
const showDatesCheckbox = document.getElementById('show-dates-checkbox');

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
// MOVIE CARD RENDERING
// ============================================

function createMovieCard(movie, index) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;
  card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
  
  const stars = ratingToStars(movie.rating);
  const rewatchIcon = movie.rewatch ? '<span class="rewatch-icon">↻</span>' : '';
  const dateBadge = (showDatesOnPosters && movie.watchedDate) 
    ? `<div class="date-badge">${formatDateBadge(movie.watchedDate)}</div>` 
    : '';
  const rewatchBadge = (movie.watchIndex && movie.watchIndex > 1) 
    ? `<div class="rewatch-badge">x${movie.watchIndex}</div>` 
    : '';
  const hasAlternatives = movie.allPosters && movie.allPosters.length > 1;
  
  card.innerHTML = `
    <div class="poster-container">
      ${dateBadge}
      ${rewatchBadge}
      <img 
        src="${movie.posterUrl}" 
        alt="${movie.title}"
        class="poster-img"
        crossorigin="anonymous"
        loading="lazy"
      />
      <div class="stars-overlay">${stars}${rewatchIcon}</div>
      ${!isComplete && hasAlternatives ? `
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
  const posters = movie.allPosters.map(p => {
    if (typeof p === 'string') {
      return { url: p, lang: 'en', isEnglish: true };
    }
    return p;
  });
  
  const englishPosters = posters.filter(p => p.isEnglish);
  const intlPosters = posters.filter(p => !p.isEnglish);
  const hasIntl = intlPosters.length > 0;
  
  const picker = document.createElement('div');
  picker.className = 'poster-picker-modal';
  picker.innerHTML = `
    <div class="poster-picker-content">
      <div class="poster-picker-header">
        <h3>Choose poster</h3>
        <button class="poster-picker-close">×</button>
      </div>
      ${hasIntl ? `
        <div class="poster-filter-tabs">
          <button class="poster-filter-btn active" data-filter="english">
            🇺🇸 English (${englishPosters.length})
          </button>
          <button class="poster-filter-btn" data-filter="international">
            🌍 International (${intlPosters.length})
          </button>
        </div>
      ` : ''}
      <div class="poster-picker-grid" id="poster-grid">
        ${renderPosterOptions(englishPosters, movie.posterUrl)}
      </div>
    </div>
  `;
  
  document.body.appendChild(picker);
  
  // Filter tab switching
  if (hasIntl) {
    picker.querySelectorAll('.poster-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        picker.querySelectorAll('.poster-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        const grid = picker.querySelector('#poster-grid');
        const displayPosters = filter === 'english' ? englishPosters : intlPosters;
        grid.innerHTML = renderPosterOptions(displayPosters, movie.posterUrl);
        
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

function renderMoviesGrid() {
  moviesGrid.innerHTML = '';
  sortMoviesByDate();
  
  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, index);
    moviesGrid.appendChild(card);
  });
}

function updateMovieCount() {
  const count = movies.length;
  movieCount.textContent = `${count} film${count !== 1 ? 's' : ''} watched`;
  monthTitle.textContent = getSelectedMonthDisplay();
  
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
  
  // Re-enable all inputs
  [monthSelect, yearSelect, movieInput, yearInput, ratingSelect, 
   rewatchCheckbox, showDatesCheckbox, watchDateInput, addMovieBtn, 
   completeBtn, letterboxdUrl, importDiaryBtn, clearMoviesBtn].forEach(el => {
    if (el) el.disabled = false;
  });
  
  downloadBtn.style.display = 'none';
  if (fabDownload) fabDownload.style.display = 'none';
  
  renderMoviesGrid();
  renderMovieList();
  updateMovieCount();
  if (currentView === 'calendar') renderCalendarView();
  
  showSuccess('All movies cleared');
}

clearMoviesBtn?.addEventListener('click', clearAllMovies);

// ============================================
// LETTERBOXD IMPORT
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

async function fetchLetterboxdDiary(username, year, month) {
  const rssUrl = `https://letterboxd.com/${username}/rss/`;
  updateProgress(15, `Fetching ${username}'s diary...`);
  
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    try {
      updateProgress(15 + (i * 10), `Connecting (${i + 1}/${CORS_PROXIES.length})...`);
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
    const { xml, targetMonth, targetYear } = await fetchLetterboxdDiary(username, year, month);
    
    updateProgress(30, 'Parsing entries...');
    const diaryEntries = parseLetterboxdRSS(xml, targetMonth, targetYear);
    
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
  
  showSuccess('Summary complete! Ready to download.');
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
    showToast('Loading all movie posters...', 'success');
    
    // Step 1: Preload ALL movie poster images as data URLs
    const totalMovies = movies.length;
    const imageDataUrls = [];
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      if (downloadBtn) {
        downloadBtn.innerHTML = `<span class="btn-icon">⏳</span> ${i + 1}/${totalMovies}`;
      }
      
      const dataUrl = await loadImageAsDataUrl(movie.posterUrl);
      imageDataUrls.push(dataUrl || movie.posterUrl);
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 100));
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
      width: 1200px;
    `;
    
    // Header
    exportClone.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <h1 style="font-family: 'Outfit', sans-serif; font-size: 42px; font-weight: 800; color: #f5f5f7; margin: 0 0 8px 0; letter-spacing: -1px;">${getSelectedMonthDisplay()}</h1>
        <p style="font-family: 'Outfit', sans-serif; font-size: 18px; color: #a1a8b3; margin: 0;">${totalMovies} film${totalMovies !== 1 ? 's' : ''} watched</p>
      </div>
      <div id="clone-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px;"></div>
    `;
    
    document.body.appendChild(exportClone);
    
    const grid = exportClone.querySelector('#clone-grid');
    
    // Add each movie card
    movies.forEach((movie, index) => {
      const stars = ratingToStars(movie.rating);
      const dateBadge = showDatesOnPosters && movie.watchedDate ? formatDateBadge(movie.watchedDate) : '';
      const rewatchBadge = movie.watchIndex > 1 ? `x${movie.watchIndex}` : '';
      
      const card = document.createElement('div');
      card.style.cssText = 'position: relative;';
      
      card.innerHTML = `
        <div style="position: relative; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; background: #13171c; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
          ${dateBadge ? `<div style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.85); color: #f5f5f7; font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 600; padding: 3px 6px; border-radius: 4px; z-index: 2;">${dateBadge}</div>` : ''}
          ${rewatchBadge ? `<div style="position: absolute; top: 6px; right: 6px; background: rgba(64,188,244,0.2); border: 1px solid #40bcf4; color: #40bcf4; font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; z-index: 3;">${rewatchBadge}</div>` : ''}
          <img src="${imageDataUrls[index]}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 8px 6px; text-align: center; color: #00e054; font-family: 'Outfit', sans-serif; font-size: 14px; letter-spacing: 1px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);">
            ${stars}${movie.rewatch ? '<span style="margin-left: 4px; color: #40bcf4;">↻</span>' : ''}
          </div>
        </div>
      `;
      
      grid.appendChild(card);
    });
    
    // Wait for inline images to render
    await new Promise(r => setTimeout(r, 500));
    
    if (downloadBtn) downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Capturing...';
    
    // Step 3: Capture the clone
    const canvas = await html2canvas(exportClone, {
      backgroundColor: '#0c0f13',
      scale: 2,
      logging: true,
      useCORS: true,
      allowTaint: true,
    });
    
    // Clean up clone
    document.body.removeChild(exportClone);
    
    // Step 4: Download
    const link = document.createElement('a');
    link.download = `${getSelectedMonthDisplay().replace(/\s+/g, '-')}-Movies.png`;
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
