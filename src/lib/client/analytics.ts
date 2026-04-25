import { browser } from '$app/environment';

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	}
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
	if (!browser || typeof window.gtag !== 'function') return;
	window.gtag('event', name, params);
}

export function trackLogin(method: 'email' | 'google') {
	trackEvent('login', { method });
}

export function trackSignUp(method: 'email' | 'google') {
	trackEvent('sign_up', { method });
}

export function trackLogout() {
	trackEvent('logout');
}

export function trackHumanize(wordCount: number) {
	trackEvent('humanize_text', { word_count: wordCount });
}

export function trackDetect(wordCount: number) {
	trackEvent('detect_text', { word_count: wordCount });
}

export function trackPlanClick(plan: string, billingCycle: string, source: string) {
	trackEvent('plan_click', { plan, billing_cycle: billingCycle, source });
}

export function trackPageVisit(page: 'dashboard' | 'settings' | 'billing' | 'history') {
	trackEvent('page_visit', { page });
}

export function trackBillingPortalClick() {
	trackEvent('billing_portal_click');
}

export function trackDeleteAccount() {
	trackEvent('delete_account');
}

export function trackWordPackClick(variantId: string, source: string) {
	trackEvent('word_pack_click', { variant_id: variantId, source });
}
