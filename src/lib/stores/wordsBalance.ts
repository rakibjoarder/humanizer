import { writable } from 'svelte/store';

/** Live words balance — updated immediately after humanize/detect without a page reload. */
export const wordsBalanceStore = writable<number>(0);
