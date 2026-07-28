(function () {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('portfolio-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const icon = toggle.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };

  const initThemeToggle = () => {
    const container = document.querySelector('.site-header .container');
    if (!container) return;

    let toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      toggle.setAttribute('data-theme-toggle', '');
      toggle.innerHTML = '<span class="theme-icon" aria-hidden="true">🌙</span><span class="sr-only">Toggle theme</span>';
      container.appendChild(toggle);
    }

    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem('portfolio-theme', nextTheme);
    });
  };

  if (storedTheme) {
    applyTheme(storedTheme);
  } else if (systemPrefersDark) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }

  initThemeToggle();
})();
