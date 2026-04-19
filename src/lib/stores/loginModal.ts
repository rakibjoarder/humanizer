import { writable } from 'svelte/store';

export const loginModalOpen = writable(false);

/** Post-login path (must start with /), e.g. /pricing */
export const loginModalRedirect = writable<string | null>(null);

export function openLoginModal(redirect: string | null = null) {
	loginModalRedirect.set(redirect);
	loginModalOpen.set(true);
}

export function closeLoginModal() {
	loginModalOpen.set(false);
	loginModalRedirect.set(null);
}
