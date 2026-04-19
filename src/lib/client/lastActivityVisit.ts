/** sessionStorage key — last activity row opened (detect / humanize detail). */
export const LAST_ACTIVITY_ID_KEY = 'hai-last-activity-id';

export function setLastVisitedActivityId(id: string): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(LAST_ACTIVITY_ID_KEY, id);
	} catch {
		/* private mode */
	}
}

export function getLastVisitedActivityId(): string | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		return sessionStorage.getItem(LAST_ACTIVITY_ID_KEY);
	} catch {
		return null;
	}
}
