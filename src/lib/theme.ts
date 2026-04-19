/** localStorage key — keep in sync with inline script in `app.html` */
export const THEME_STORAGE_KEY = 'hai-theme';

export type ThemeMode = 'dark' | 'light';

export function readStoredTheme(): ThemeMode {
	if (typeof localStorage === 'undefined') return 'dark';
	try {
		return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
	} catch {
		return 'dark';
	}
}

export function getDocumentTheme(): ThemeMode {
	if (typeof document === 'undefined') return 'dark';
	return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(mode: ThemeMode): void {
	if (typeof document === 'undefined') return;
	if (mode === 'light') {
		document.documentElement.setAttribute('data-theme', 'light');
	} else {
		document.documentElement.removeAttribute('data-theme');
	}
	try {
		localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		/* private mode */
	}
}

export function toggleTheme(): ThemeMode {
	const next = getDocumentTheme() === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	return next;
}
