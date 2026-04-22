-- Paginated activity feed (detections + humanizations) for /activity.
-- SECURITY INVOKER so existing RLS on detections / humanizations applies.

create or replace function public.activity_feed_count(p_type text default 'all')
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
	select
		(case when p_type in ('all', 'detect') then (select count(*)::bigint from public.detections) else 0::bigint end)
		+ (case when p_type in ('all', 'humanize') then (select count(*)::bigint from public.humanizations) else 0::bigint end);
$$;

create or replace function public.activity_feed_page(
	p_limit integer,
	p_offset integer,
	p_type text default 'all',
	p_newest_first boolean default true
)
returns table (
	id uuid,
	activity_type text,
	word_count integer,
	classification text,
	ai_probability double precision,
	created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $func$
declare
	lim int := greatest(1, least(coalesce(p_limit, 20), 100));
	off int := greatest(0, coalesce(p_offset, 0));
begin
	if p_newest_first then
		return query
		select x.id, x.activity_type, x.word_count, x.classification, x.ai_probability, x.created_at
		from (
			select
				d.id,
				'detect'::text as activity_type,
				coalesce(d.word_count, 0) as word_count,
				d.classification,
				d.ai_probability::double precision as ai_probability,
				d.created_at
			from public.detections d
			union all
			select
				h.id,
				'humanize'::text,
				coalesce(h.word_count, 0),
				null::text,
				null::double precision,
				h.created_at
			from public.humanizations h
		) x
		where (p_type = 'all' or x.activity_type = p_type)
		order by x.created_at desc, x.id desc
		limit lim
		offset off;
	else
		return query
		select x.id, x.activity_type, x.word_count, x.classification, x.ai_probability, x.created_at
		from (
			select
				d.id,
				'detect'::text as activity_type,
				coalesce(d.word_count, 0) as word_count,
				d.classification,
				d.ai_probability::double precision as ai_probability,
				d.created_at
			from public.detections d
			union all
			select
				h.id,
				'humanize'::text,
				coalesce(h.word_count, 0),
				null::text,
				null::double precision,
				h.created_at
			from public.humanizations h
		) x
		where (p_type = 'all' or x.activity_type = p_type)
		order by x.created_at asc, x.id asc
		limit lim
		offset off;
	end if;
end;
$func$;

grant execute on function public.activity_feed_count(text) to authenticated;
grant execute on function public.activity_feed_page(integer, integer, text, boolean) to authenticated;
