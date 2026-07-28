const API_KEY = '749895aea84f8b25d4c4bf2e0537c72e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const weatherPanel = document.getElementById('weather-panel');
const errorMessage = document.getElementById('error-message');
const loadingMessage = document.getElementById('loading-message');
const themeToggle = document.getElementById('theme-toggle');
const searchButton = searchForm.querySelector('button[type="submit"]');

let activeController = null;
let activeRequestId = 0;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showLoading() {
  loadingMessage.textContent = 'Loading weather…';
  errorMessage.textContent = '';
  searchButton.disabled = true;
  cityInput.disabled = true;
}

function hideLoading() {
  loadingMessage.textContent = '';
  searchButton.disabled = false;
  cityInput.disabled = false;
  cityInput.focus();
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearWeather() {
  weatherPanel.innerHTML = `
    <div class="weather-placeholder">
      <p>Search for a city to see live weather details.</p>
    </div>
  `;
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function displayWeather(data) {
  const iconUrl = `https://openweathermap.org/img/wn/${escapeHtml(data.weather[0].icon)}@2x.png`;
  const temperature = Math.round(data.main.temp - 273.15);
  const feelsLike = Math.round(data.main.feels_like - 273.15);
  const visibility = (data.visibility / 1000).toFixed(1);
  const cityName = escapeHtml(data.name);
  const country = escapeHtml(data.sys.country);
  const description = escapeHtml(data.weather[0].description);

  weatherPanel.innerHTML = `
    <article class="weather-card" aria-labelledby="weather-location">
      <div class="weather-head">
        <div>
          <h3 id="weather-location">${cityName}, ${country}</h3>
          <p class="weather-summary">${description}</p>
        </div>
        <div class="weather-temp">
          <img class="weather-icon" src="${iconUrl}" alt="${description} weather icon" />
          <strong>${temperature}°C</strong>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <span>Feels Like</span>
          <strong>${feelsLike}°C</strong>
        </div>
        <div class="metric-card">
          <span>Humidity</span>
          <strong>${data.main.humidity}%</strong>
        </div>
        <div class="metric-card">
          <span>Wind Speed</span>
          <strong>${data.wind.speed} m/s</strong>
        </div>
        <div class="metric-card">
          <span>Pressure</span>
          <strong>${data.main.pressure} hPa</strong>
        </div>
        <div class="metric-card">
          <span>Visibility</span>
          <strong>${visibility} km</strong>
        </div>
        <div class="metric-card">
          <span>Sunrise</span>
          <strong>${formatTime(data.sys.sunrise)}</strong>
        </div>
        <div class="metric-card">
          <span>Sunset</span>
          <strong>${formatTime(data.sys.sunset)}</strong>
        </div>
      </div>
    </article>
  `;
}

async function fetchWeather(city) {
  const trimmedCity = city.trim();

  if (!trimmedCity) {
    showError('Please enter a city name.');
    clearWeather();
    return;
  }

  if (activeController) {
    activeController.abort();
  }

  const requestId = ++activeRequestId;
  activeController = new AbortController();

  showLoading();

  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}&units=metric`, {
      signal: activeController.signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('City not found. Please try another city.');
      }

      if (response.status === 401) {
        throw new Error('The API key is invalid. Please update the app key.');
      }

      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }

      if (response.status >= 500) {
        throw new Error('The weather service is temporarily unavailable. Please try again soon.');
      }

      throw new Error('Unable to fetch weather right now. Please try again later.');
    }

    const data = await response.json();

    if (!data || !data.main || !data.weather || !data.sys || typeof data.main.temp !== 'number') {
      throw new Error('The weather response was incomplete. Please try another city.');
    }

    if (requestId !== activeRequestId) {
      return;
    }

    displayWeather(data);
    hideLoading();
    showError('');
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    hideLoading();
    showError(error.message || 'A network error occurred. Please check your connection and try again.');
    clearWeather();
  } finally {
    if (activeController && activeController.signal.aborted) {
      activeController = null;
    }
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = themeToggle.querySelector('span');
  icon.textContent = theme === 'dark' ? '☀️' : '🌙';

  try {
    localStorage.setItem('weather-dashboard-theme', theme);
  } catch (error) {
    console.warn('Theme preference could not be saved:', error);
  }
}

function initTheme() {
  let storedTheme = '';

  try {
    storedTheme = localStorage.getItem('weather-dashboard-theme') || '';
  } catch (error) {
    console.warn('Theme preference could not be read:', error);
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchWeather(cityInput.value);
});

initTheme();
clearWeather();
