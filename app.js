// ============================================
// LETTERBOXD-STYLE MONTHLY MOVIE SUMMARY
// ============================================

// TMDB API Configuration
// Get your free API key at: https://www.themoviedb.org/settings/api
// This is a demo key - replace with your own for production use
const TMDB_API_KEY = '2dca580c2a14b55200e784d157207b4d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// CORS Proxies for Letterboxd scraping (fallback chain)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://cors-anywhere.herokuapp.com/',
];

// ============================================
// STATE
// ============================================

let selectedMonth = 0; // 0-11 (January = 0)
let selectedYear = new Date().getFullYear();
let movies = [];
let isComplete = false;
let currentView = 'grid'; // 'grid' or 'calendar'
let showDatesOnPosters = true; // Toggle for date badges

// Month names for display
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
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const monthTitle = document.getElementById('month-title');
const movieCount = document.getElementById('movie-count');
const moviesGrid = document.getElementById('movies-grid');
const calendarView = document.getElementById('calendar-view');
const movieListItems = document.getElementById('movie-list-items');

// Letterboxd import elements
const letterboxdUrl = document.getElementById('letterboxd-url');
const importDiaryBtn = document.getElementById('import-diary-btn');
const importProgress = document.getElementById('import-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Clear and list elements
const clearMoviesBtn = document.getElementById('clear-movies-btn');
const movieListCount = document.getElementById('movie-list-count');

// View toggle elements
const gridViewBtn = document.getElementById('grid-view-btn');
const calendarViewBtn = document.getElementById('calendar-view-btn');

// Show dates toggle
const showDatesCheckbox = document.getElementById('show-dates-checkbox');

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
  
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 4000);
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
  
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);
}

function ratingToStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  
  let stars = '★'.repeat(fullStars);
  if (hasHalf) {
    stars += '½';
  }
  
  return stars;
}

// Format date for display (e.g., "Jan 14")
function formatDateBadge(dateStr) {
  if (!dateStr) return '';
  
  // Handle "YYYY-MM-DD" format directly to avoid timezone issues
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthName = MONTH_NAMES[month - 1].slice(0, 3);
    return `${monthName} ${day}`;
  }
  
  // Fallback for other date formats
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const day = d.getDate();
  return `${month} ${day}`;
}

// Get selected month/year as display string
function getSelectedMonthDisplay() {
  return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
}

// Parse a date string to Date object (handling timezone issues)
function parseWatchedDate(dateStr) {
  if (dateStr && typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return dateStr ? new Date(dateStr) : new Date(0);
}

// Sort movies by watched date
function sortMoviesByDate() {
  console.log('Sorting movies by date. Count:', movies.length);
  movies.sort((a, b) => {
    const dateA = parseWatchedDate(a.watchedDate);
    const dateB = parseWatchedDate(b.watchedDate);
    return dateA - dateB;
  });
  
  // After sorting, compute watch indices for rewatches
  computeWatchIndices();
  
  // Debug: Log sorted order
  movies.forEach((m, i) => {
    console.log(`${i + 1}. ${m.title} - ${m.watchedDate} (watch #${m.watchIndex})`);
  });
}

// Compute watch index for each movie (x2, x3 for rewatches)
function computeWatchIndices() {
  const watchCounts = {};
  
  movies.forEach(movie => {
    // Create a unique key based on title and year
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
  
  if (year) {
    params.append('year', year);
  }
  
  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to search TMDB');
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error('TMDB API Error:', error);
    throw error;
  }
}

// Fetch all available posters for a movie
async function fetchMoviePosters(movieId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch posters');
    }
    
    const data = await response.json();
    
    // Return all poster paths (limit to 12 for UI)
    if (data.posters && data.posters.length > 0) {
      return data.posters
        .slice(0, 12)
        .map(p => getPosterUrl(p.file_path))
        .filter(url => url !== null);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching posters:', error);
    return [];
  }
}

function getPosterUrl(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

// ============================================
// MOVIE CARD RENDERING
// ============================================

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;
  
  const stars = ratingToStars(movie.rating);
  const rewatchIcon = movie.rewatch ? '<span class="rewatch-icon">↻</span>' : '';
  const dateBadge = (showDatesOnPosters && movie.watchedDate) ? `<div class="date-badge">${formatDateBadge(movie.watchedDate)}</div>` : '';
  
  // Show rewatch badge (x2, x3, etc) for subsequent watches of the same movie
  const rewatchBadge = (movie.watchIndex && movie.watchIndex > 1) ? `<div class="rewatch-badge">x${movie.watchIndex}</div>` : '';
  
  // Check if movie has alternative posters
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
  
  // Add poster picker functionality
  if (!isComplete && hasAlternatives) {
    const trigger = card.querySelector('.poster-picker-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openPosterPicker(movie);
    });
  }
  
  return card;
}

// Poster picker modal
function openPosterPicker(movie) {
  // Remove existing picker if any
  closePosterPicker();
  
  const picker = document.createElement('div');
  picker.className = 'poster-picker-modal';
  picker.innerHTML = `
    <div class="poster-picker-content">
      <div class="poster-picker-header">
        <h3>Choose poster for "${movie.title}"</h3>
        <button class="poster-picker-close">&times;</button>
      </div>
      <div class="poster-picker-grid">
        ${movie.allPosters.map((url, index) => `
          <div class="poster-option ${url === movie.posterUrl ? 'selected' : ''}" data-url="${url}">
            <img src="${url}" alt="Poster option ${index + 1}" crossorigin="anonymous" />
            ${url === movie.posterUrl ? '<span class="current-badge">Current</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(picker);
  
  // Close button
  picker.querySelector('.poster-picker-close').addEventListener('click', closePosterPicker);
  
  // Click outside to close
  picker.addEventListener('click', (e) => {
    if (e.target === picker) {
      closePosterPicker();
    }
  });
  
  // Poster selection
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
  
  // Escape key to close
  document.addEventListener('keydown', handleEscapeKey);
}

function closePosterPicker() {
  const picker = document.querySelector('.poster-picker-modal');
  if (picker) {
    picker.remove();
  }
  document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closePosterPicker();
  }
}

function renderMoviesGrid() {
  moviesGrid.innerHTML = '';
  
  // Sort before rendering
  sortMoviesByDate();
  
  movies.forEach(movie => {
    const card = createMovieCard(movie);
    moviesGrid.appendChild(card);
  });
}

function updateMovieCount() {
  const count = movies.length;
  movieCount.textContent = `${count} film${count !== 1 ? 's' : ''} watched`;
  
  // Update sidebar count badge
  if (movieListCount) {
    movieListCount.textContent = count;
  }
  
  // Update header title
  monthTitle.textContent = getSelectedMonthDisplay();
}

// ============================================
// CALENDAR VIEW RENDERING
// ============================================

function renderCalendarView() {
  console.log('Rendering calendar for:', MONTH_NAMES[selectedMonth], selectedYear);
  
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sunday
  
  // Group movies by day
  const moviesByDay = {};
  movies.forEach(movie => {
    if (movie.watchedDate) {
      // Parse YYYY-MM-DD format directly to avoid timezone issues
      let movieMonth, movieYear, movieDay;
      
      if (typeof movie.watchedDate === 'string' && movie.watchedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = movie.watchedDate.split('-').map(Number);
        movieYear = y;
        movieMonth = m - 1; // Convert to 0-indexed
        movieDay = d;
      } else {
        const date = new Date(movie.watchedDate);
        movieYear = date.getFullYear();
        movieMonth = date.getMonth();
        movieDay = date.getDate();
      }
      
      console.log(`Movie "${movie.title}" watched: ${movieYear}-${movieMonth + 1}-${movieDay}, selected: ${selectedYear}-${selectedMonth + 1}`);
      
      if (movieMonth === selectedMonth && movieYear === selectedYear) {
        if (!moviesByDay[movieDay]) moviesByDay[movieDay] = [];
        moviesByDay[movieDay].push(movie);
      }
    }
  });
  
  console.log('Movies by day:', moviesByDay);
  
  // Day names header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let html = `
    <div class="calendar-header">
      ${dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid">
  `;
  
  // Empty cells before first day
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  // Days of the month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayMovies = moviesByDay[day] || [];
    const hasMovies = dayMovies.length > 0;
    const isToday = today.getDate() === day && 
                    today.getMonth() === selectedMonth && 
                    today.getFullYear() === selectedYear;
    
    let moviesHtml = '';
    if (hasMovies) {
      // Show up to 3 thumbnails, then count
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
  console.log('Switching to view:', view);
  currentView = view;
  
  // Update button states
  gridViewBtn.classList.toggle('active', view === 'grid');
  calendarViewBtn.classList.toggle('active', view === 'calendar');
  
  // Show/hide views
  if (view === 'grid') {
    moviesGrid.style.display = 'grid';
    calendarView.style.display = 'none';
  } else {
    moviesGrid.style.display = 'none';
    calendarView.style.display = 'block';
    console.log('Rendering calendar view, movies count:', movies.length);
    renderCalendarView();
  }
}

function renderMovieList() {
  movieListItems.innerHTML = '';
  
  // Sort before rendering
  sortMoviesByDate();
  
  movies.forEach((movie, index) => {
    const li = document.createElement('li');
    const stars = ratingToStars(movie.rating);
    const rewatchBadge = movie.rewatch ? '<span class="movie-rewatch">↻</span>' : '';
    const datePart = movie.watchedDate ? ` • ${formatDateBadge(movie.watchedDate)}` : '';
    const watchIndexBadge = (movie.watchIndex && movie.watchIndex > 1) ? `<span class="movie-watch-index">x${movie.watchIndex}</span>` : '';
    
    li.innerHTML = `
      <div class="movie-info">
        <span class="movie-title">${movie.title} (${movie.year})${datePart}${watchIndexBadge}</span>
        <span class="movie-rating">${stars}${rewatchBadge}</span>
      </div>
      ${!isComplete ? `<button class="remove-btn" data-index="${index}" title="Remove">×</button>` : ''}
    `;
    
    movieListItems.appendChild(li);
  });
  
  // Add remove button listeners
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
  movies.splice(index, 1);
  renderMoviesGrid();
  renderMovieList();
  updateMovieCount();
  
  // Re-render calendar if in calendar view
  if (currentView === 'calendar') {
    renderCalendarView();
  }
  
  showSuccess('Movie removed');
}

// ============================================
// CLEAR ALL MOVIES
// ============================================

function clearAllMovies() {
  if (movies.length === 0) {
    showError('No movies to clear');
    return;
  }
  
  if (!confirm(`Clear all ${movies.length} movies? This cannot be undone.`)) {
    return;
  }
  
  // Reset state
  movies = [];
  isComplete = false;
  
  // Re-enable all inputs
  monthSelect.disabled = false;
  yearSelect.disabled = false;
  movieInput.disabled = false;
  yearInput.disabled = false;
  ratingSelect.disabled = false;
  rewatchCheckbox.disabled = false;
  showDatesCheckbox.disabled = false;
  watchDateInput.disabled = false;
  addMovieBtn.disabled = false;
  completeBtn.disabled = false;
  letterboxdUrl.disabled = false;
  importDiaryBtn.disabled = false;
  clearMoviesBtn.disabled = false;
  
  // Hide download button
  downloadBtn.style.display = 'none';
  
  // Update UI
  renderMoviesGrid();
  renderMovieList();
  updateMovieCount();
  
  // Re-render calendar if in calendar view
  if (currentView === 'calendar') {
    renderCalendarView();
  }
  
  showSuccess('All movies cleared');
}

clearMoviesBtn.addEventListener('click', clearAllMovies);

// ============================================
// LETTERBOXD IMPORT
// ============================================

function parseLetterboxdUrl(url) {
  // Extract username from various Letterboxd URL formats
  const patterns = [
    /letterboxd\.com\/([^\/]+)\/?$/,           // letterboxd.com/username/
    /letterboxd\.com\/([^\/]+)\/films/,        // letterboxd.com/username/films/...
    /letterboxd\.com\/([^\/]+)\/list/,         // letterboxd.com/username/list/...
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Maybe they just entered a username
  if (/^[a-zA-Z0-9_]+$/.test(url.trim())) {
    return url.trim();
  }
  
  return null;
}

function parseSelectedMonth() {
  // Return month (01-12) and year as strings for URL construction
  const month = String(selectedMonth + 1).padStart(2, '0');
  const year = String(selectedYear);
  return { month, year };
}

async function fetchLetterboxdDiary(username, year, month) {
  // Use RSS feed - it's static XML and doesn't require JavaScript rendering
  const rssUrl = `https://letterboxd.com/${username}/rss/`;
  
  console.log('Fetching RSS feed:', rssUrl);
  updateProgress(15, `Fetching ${username}'s RSS feed...`);
  
  // Try each CORS proxy until one works
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    try {
      const proxyUrl = proxy + encodeURIComponent(rssUrl);
      console.log(`Trying proxy ${i + 1}/${CORS_PROXIES.length}:`, proxy);
      updateProgress(15 + (i * 5), `Trying connection ${i + 1}/${CORS_PROXIES.length}...`);
      
      const response = await fetch(proxyUrl);
      
      console.log(`Proxy ${i + 1} response status:`, response.status);
      
      if (response.ok) {
        const xml = await response.text();
        console.log(`Received ${xml.length} bytes`);
        
        // Check if we got RSS/XML content
        if (xml && xml.includes('<item>') && xml.includes('letterboxd')) {
          console.log('Successfully fetched RSS with proxy:', proxy);
          return { xml, rssUrl, targetMonth: month, targetYear: year };
        }
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error.message);
    }
  }
  
  throw new Error(`Could not fetch Letterboxd data for "${username}". Make sure the username is correct and the profile is public.`);
}

/**
 * PARSE LETTERBOXD RSS FEED
 * RSS is static XML - much more reliable than scraping JS-rendered HTML
 */
function parseLetterboxdRSS(xml, targetMonth, targetYear) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  
  const diaryEntries = [];
  const seenKeys = new Set();
  
  // Get all items from RSS feed
  const items = doc.querySelectorAll('item');
  console.log('RSS items found:', items.length);
  
  // Target date range for filtering
  const targetMonthNum = parseInt(targetMonth);
  const targetYearNum = parseInt(targetYear);
  
  items.forEach(item => {
    try {
      const entry = parseRSSItem(item, targetMonthNum, targetYearNum);
      if (entry) {
        const key = `${entry.title.toLowerCase()}-${entry.watchedDate}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          diaryEntries.push(entry);
          console.log(`Added: "${entry.title}" (${entry.rating}★) - watched ${entry.watchedDate}`);
        }
      }
    } catch (e) {
      console.warn('Failed to parse RSS item:', e);
    }
  });
  
  console.log(`Found ${diaryEntries.length} entries for ${targetMonth}/${targetYear}`);
  return diaryEntries;
}

/**
 * Parse a single RSS item and filter by month
 */
function parseRSSItem(item, targetMonth, targetYear) {
  // Get the watched date from letterboxd:watchedDate
  const watchedDateEl = item.getElementsByTagName('letterboxd:watchedDate')[0];
  if (!watchedDateEl) return null;
  
  const watchedDate = watchedDateEl.textContent; // Format: "2026-01-30"
  const [itemYear, itemMonth] = watchedDate.split('-').map(Number);
  
  // Filter by target month/year
  if (itemYear !== targetYear || itemMonth !== targetMonth) {
    return null;
  }
  
  // Get title from letterboxd:filmTitle
  const filmTitleEl = item.getElementsByTagName('letterboxd:filmTitle')[0];
  const title = filmTitleEl ? filmTitleEl.textContent : null;
  
  if (!title) return null;
  
  // Get release year from letterboxd:filmYear
  const filmYearEl = item.getElementsByTagName('letterboxd:filmYear')[0];
  const year = filmYearEl ? parseInt(filmYearEl.textContent) : null;
  
  // Get rating from letterboxd:memberRating
  const ratingEl = item.getElementsByTagName('letterboxd:memberRating')[0];
  let rating = 3; // Default
  if (ratingEl) {
    const ratingValue = parseFloat(ratingEl.textContent);
    if (!isNaN(ratingValue)) {
      rating = ratingValue;
    }
  }
  
  // Check for rewatch from letterboxd:rewatch
  const rewatchEl = item.getElementsByTagName('letterboxd:rewatch')[0];
  const isRewatch = rewatchEl ? rewatchEl.textContent === 'Yes' : false;
  
  return {
    title,
    year,
    rating,
    rewatch: isRewatch,
    watchedDate
  };
}

function updateProgress(percent, text) {
  progressFill.style.width = `${percent}%`;
  progressText.textContent = text;
}

async function importFromLetterboxd() {
  const urlInput = letterboxdUrl.value.trim();
  
  if (!urlInput) {
    showError('Please enter your Letterboxd username or profile URL');
    return;
  }
  
  const username = parseLetterboxdUrl(urlInput);
  
  if (!username) {
    showError('Invalid input. Enter username or URL like: letterboxd.com/username/');
    return;
  }
  
  const { month, year } = parseSelectedMonth();
  
  // Show progress
  importProgress.style.display = 'block';
  importDiaryBtn.disabled = true;
  importDiaryBtn.innerHTML = '<span class="btn-icon">⏳</span> Importing...';
  
  try {
    // Step 1: Fetch RSS feed
    updateProgress(10, `Fetching ${username}'s diary for ${getSelectedMonthDisplay()}...`);
    const { xml, targetMonth: tMonth, targetYear: tYear } = await fetchLetterboxdDiary(username, year, month);
    
    // Step 2: Parse RSS entries for the target month
    updateProgress(30, 'Parsing diary entries...');
    const diaryEntries = parseLetterboxdRSS(xml, tMonth, tYear);
    
    if (diaryEntries.length === 0) {
      showError(`No diary entries found for ${getSelectedMonthDisplay()}. Make sure the user has logged films this month.`);
      return;
    }
    
    // Step 3: Convert to movie objects with TMDB data
    updateProgress(40, `Found ${diaryEntries.length} diary entries. Fetching posters...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < diaryEntries.length; i++) {
      const entry = diaryEntries[i];
      const progress = 40 + ((i + 1) / diaryEntries.length) * 55;
      updateProgress(progress, `Fetching "${entry.title}" (${i + 1}/${diaryEntries.length})`);
      
      try {
        // Search TMDB
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
            posterUrl: posterUrl,
            allPosters: allPosters,
            rating: entry.rating,
            rewatch: entry.rewatch,
            watchedDate: entry.watchedDate // IMPORTANT: Include the watched date
          });
          
          successCount++;
        } else {
          failCount++;
          console.warn(`No poster found for: ${entry.title}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (e) {
        failCount++;
        console.warn(`Failed to fetch: ${entry.title}`, e);
      }
    }
    
    // Step 4: Update UI
    updateProgress(100, 'Complete!');
    
    renderMoviesGrid();
    renderMovieList();
    updateMovieCount();
    
    // Re-render calendar if in calendar view
    if (currentView === 'calendar') {
      renderCalendarView();
    }
    
    // Build result message
    let message = `Imported ${successCount} movies`;
    if (failCount > 0) message += ` (${failCount} not found)`;
    
    showSuccess(message);
    
  } catch (error) {
    showError(error.message || 'Failed to import from Letterboxd');
    console.error('Import error:', error);
  } finally {
    // Reset UI
    setTimeout(() => {
      importProgress.style.display = 'none';
      progressFill.style.width = '0%';
    }, 2000);
    
    importDiaryBtn.disabled = false;
    importDiaryBtn.innerHTML = '<span class="btn-icon">📥</span> Import Diary for Month';
  }
}

importDiaryBtn.addEventListener('click', importFromLetterboxd);

// ============================================
// EVENT HANDLERS
// ============================================

// Month Selection
monthSelect.addEventListener('change', (e) => {
  selectedMonth = parseInt(e.target.value);
  updateMonthDisplay();
});

// Year Selection
yearSelect.addEventListener('change', (e) => {
  selectedYear = parseInt(e.target.value);
  updateMonthDisplay();
});

function updateMonthDisplay() {
  monthTitle.textContent = getSelectedMonthDisplay();
  
  // Update watch date input to be within selected month
  updateWatchDateDefault();
  
  // Re-render calendar if in calendar view
  if (currentView === 'calendar') {
    renderCalendarView();
  }
}

function updateWatchDateDefault() {
  // Set default watch date to first day of selected month
  const defaultDate = new Date(selectedYear, selectedMonth, 1);
  const dateStr = defaultDate.toISOString().split('T')[0];
  watchDateInput.value = dateStr;
}

// View Toggle
gridViewBtn.addEventListener('click', () => switchView('grid'));
calendarViewBtn.addEventListener('click', () => switchView('calendar'));

// Show Dates Toggle
showDatesCheckbox.addEventListener('change', (e) => {
  showDatesOnPosters = e.target.checked;
  renderMoviesGrid(); // Re-render to show/hide date badges
});

// Add Movie
addMovieBtn.addEventListener('click', async () => {
  const title = movieInput.value.trim();
  const year = yearInput.value ? parseInt(yearInput.value) : null;
  const rating = parseFloat(ratingSelect.value);
  const rewatch = rewatchCheckbox.checked;
  const watchedDate = watchDateInput.value || null;
  
  if (!title) {
    showError('Please enter a movie title');
    return;
  }
  
  // Disable button and show loading state
  addMovieBtn.disabled = true;
  addMovieBtn.innerHTML = '<span class="btn-icon">⏳</span> Fetching...';
  
  try {
    const movieData = await searchMovie(title, year);
    
    if (!movieData) {
      showError(`No movie found for "${title}"`);
      return;
    }
    
    if (!movieData.poster_path) {
      showError(`No poster available for "${movieData.title}"`);
      return;
    }
    
    const posterUrl = getPosterUrl(movieData.poster_path);
    
    // Fetch all available posters for this movie
    const allPosters = await fetchMoviePosters(movieData.id);
    
    // If the main poster isn't in the list, add it first
    if (!allPosters.includes(posterUrl)) {
      allPosters.unshift(posterUrl);
    }
    
    const movie = {
      id: Date.now(),
      tmdbId: movieData.id,
      title: movieData.title,
      year: new Date(movieData.release_date).getFullYear() || year || 'N/A',
      posterUrl: posterUrl,
      allPosters: allPosters,
      rating: rating,
      rewatch: rewatch,
      watchedDate: watchedDate
    };
    
    movies.push(movie);
    
    // Clear inputs (except date - keep it for convenience)
    movieInput.value = '';
    yearInput.value = '';
    rewatchCheckbox.checked = false;
    
    // Update UI
    renderMoviesGrid();
    renderMovieList();
    updateMovieCount();
    
    // Re-render calendar if in calendar view
    if (currentView === 'calendar') {
      renderCalendarView();
    }
    
    showSuccess(`Added "${movie.title}" (${movie.year})`);
    
  } catch (error) {
    showError('Failed to fetch movie data. Check your API key and try again.');
    console.error(error);
  } finally {
    // Reset button
    addMovieBtn.disabled = false;
    addMovieBtn.innerHTML = '<span class="btn-icon">+</span> Add Movie';
  }
});

// Allow Enter key to add movie
movieInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addMovieBtn.click();
  }
});

// Complete Button
completeBtn.addEventListener('click', () => {
  if (movies.length === 0) {
    showError('Add at least one movie before completing');
    return;
  }
  
  isComplete = true;
  
  // Disable all inputs
  monthSelect.disabled = true;
  yearSelect.disabled = true;
  movieInput.disabled = true;
  yearInput.disabled = true;
  ratingSelect.disabled = true;
  rewatchCheckbox.disabled = true;
  showDatesCheckbox.disabled = true;
  watchDateInput.disabled = true;
  addMovieBtn.disabled = true;
  completeBtn.disabled = true;
  letterboxdUrl.disabled = true;
  importDiaryBtn.disabled = true;
  clearMoviesBtn.disabled = true;
  
  // Show download button
  downloadBtn.style.display = 'flex';
  
  // Ensure grid view for final export
  switchView('grid');
  
  // Update movie list (remove delete buttons)
  renderMovieList();
  
  showSuccess('Summary complete! Ready to download.');
});

// Download PNG
downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
  
  // IMPORTANT: Always export from grid view
  const wasCalendarView = currentView === 'calendar';
  if (wasCalendarView) {
    switchView('grid');
    // Small delay to let DOM update
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  try {
    // Wait for all images to load
    const images = document.querySelectorAll('#export-area img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      })
    );
    
    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate canvas
    const canvas = await html2canvas(document.getElementById('export-area'), {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#0d1114',
      scale: 2,
      logging: false,
      imageTimeout: 15000
    });
    
    // Create download link
    const link = document.createElement('a');
    const monthSlug = getSelectedMonthDisplay().replace(/\s+/g, '-');
    link.download = `${monthSlug}-Movies.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showSuccess('PNG downloaded successfully!');
    
  } catch (error) {
    showError('Failed to generate PNG. Try again.');
    console.error('html2canvas error:', error);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="btn-icon">↓</span> Download PNG';
    
    // Restore calendar view if that's where user was
    if (wasCalendarView) {
      switchView('calendar');
    }
  }
});

// ============================================
// INITIALIZATION
// ============================================

function initYearSelector() {
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  
  // Generate years: 2010 to current + 1 (for older Letterboxd diaries)
  for (let y = 2010; y <= currentYear + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }
  
  selectedYear = currentYear;
}

function initMonthSelector() {
  // Set current month as default
  const currentMonth = new Date().getMonth();
  monthSelect.value = currentMonth;
  selectedMonth = currentMonth;
}

function init() {
  // Initialize selectors
  initYearSelector();
  initMonthSelector();
  
  // Set initial month display
  monthTitle.textContent = getSelectedMonthDisplay();
  updateMovieCount();
  
  // Set default watch date
  updateWatchDateDefault();
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);
