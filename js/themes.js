// ============================================================
// js/themes.js
// Управление цветовыми темами
// ============================================================

export const THEMES = {
    red: {
        '--color-accent': '#e74c3c',
        '--color-accent-hover': '#c0392b',
        '--color-accent-bg': 'rgba(231, 76, 60, 0.12)',
        '--color-primary': '#e74c3c',
        '--color-primary-hover': '#c0392b',
    },
    blue: {
        '--color-accent': '#3498db',
        '--color-accent-hover': '#2980b9',
        '--color-accent-bg': 'rgba(52, 152, 219, 0.12)',
        '--color-primary': '#3498db',
        '--color-primary-hover': '#2980b9',
    },
    green: {
        '--color-accent': '#2ecc71',
        '--color-accent-hover': '#27ae60',
        '--color-accent-bg': 'rgba(46, 204, 113, 0.12)',
        '--color-primary': '#2ecc71',
        '--color-primary-hover': '#27ae60',
    },
    gold: {
        '--color-accent': '#f1c40f',
        '--color-accent-hover': '#f39c12',
        '--color-accent-bg': 'rgba(241, 196, 15, 0.12)',
        '--color-primary': '#f1c40f',
        '--color-primary-hover': '#f39c12',
    },
    purple: {
        '--color-accent': '#9b59b6',
        '--color-accent-hover': '#8e44ad',
        '--color-accent-bg': 'rgba(155, 89, 182, 0.12)',
        '--color-primary': '#9b59b6',
        '--color-primary-hover': '#8e44ad',
    },
};

export function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(theme)) {
        root.style.setProperty(prop, value);
    }
    localStorage.setItem('selectedTheme', themeName);
}

export function loadSavedTheme() {
    const saved = localStorage.getItem('selectedTheme');
    if (saved && THEMES[saved]) {
        applyTheme(saved);
        return saved;
    }
    applyTheme('red');
    return 'red';
}

export function initThemeSelector(selectorId = 'theme-picker') {
    const select = document.getElementById(selectorId);
    if (!select) return;
    const saved = localStorage.getItem('selectedTheme') || 'red';
    select.value = saved;
    select.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
}