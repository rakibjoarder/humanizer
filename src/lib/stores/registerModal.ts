import { writable } from 'svelte/store';

export const registerModalOpen = writable(false);
export const registerModalRedirect = writable<string | null>(null);

export function openRegisterModal(redirect: string | null = null) {
	registerModalRedirect.set(redirect);
	registerModalOpen.set(true);
}

export function closeRegisterModal() {
	registerModalOpen.set(false);
	registerModalRedirect.set(null);
}
