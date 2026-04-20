import { posts } from '$lib/blog/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		posts: posts.map(({ slug, title, description, date, readMin, category }) => ({
			slug, title, description, date, readMin, category
		}))
	};
};
