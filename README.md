# Monthly Movie Summary Generator

A Letterboxd-style monthly movie summary page that lets you create beautiful shareable images of your monthly film watches.

## Features

- 🎬 Search movies via TMDB API
- ⭐ Add star ratings (0.5 - 5 stars)
- 🔄 Mark rewatches
- 📅 Select any month
- 🎨 Letterboxd-inspired dark theme
- 📸 Download as PNG image

## Setup

### 1. Get a TMDB API Key

1. Go to [TMDB](https://www.themoviedb.org/) and create a free account
2. Navigate to **Settings** → **API** → **Create** → **Developer**
3. Fill out the form (for "Application URL" you can use `localhost`)
4. Copy your **API Key (v3 auth)**

### 2. Configure the App

Open `app.js` and replace `YOUR_TMDB_API_KEY` with your actual API key:

```javascript
const TMDB_API_KEY = 'your_actual_api_key_here';
```

### 3. Run the App

Simply open `index.html` in your browser. For best results, use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Usage

1. **Select Month** - Choose the month for your summary
2. **Add Movies** - Enter a movie title, optionally add the year for better results
3. **Set Rating** - Choose your star rating (½ to ★★★★★)
4. **Mark Rewatch** - Check if it's a rewatch
5. **Click "Add Movie"** - The poster will be fetched automatically
6. **Repeat** - Add all your movies for the month
7. **Complete** - Click to lock your summary
8. **Download PNG** - Save your beautiful summary image!

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- [TMDB API](https://www.themoviedb.org/documentation/api) for movie data & posters
- [html2canvas](https://html2canvas.hertzen.com/) for PNG generation

## Notes

- All posters are loaded via `<img>` tags with `crossorigin="anonymous"` for CORS compatibility
- The green star color (#00e054) matches Letterboxd's signature rating color
- Grid displays 6 posters per row (responsive for smaller screens)
- PNG export uses 2x scale for high resolution

## License

MIT - Use freely for personal projects!
