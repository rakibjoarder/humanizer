-- Update activity feed RPCs to include a lightweight preview without returning full text blobs.

-- Postgres cannot change a function's return type in-place, so we must drop and recreate.
drop function if exists public.activity_feed_page(integer, integer, text, boolean);

create function public.activity_feed_page(
	p_limit integer,
	p_offset integer,
	p_type text default 'all',
	p_newest_first boolean default true
)
returns table (
	id uuid,
	activity_type text,
	word_count integer,
	preview text,
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
		select x.id, x.activity_type, x.word_count, x.preview, x.classification, x.ai_probability, x.created_at
		from (
			select
				d.id,
				'detect'::text as activity_type,
				coalesce(d.word_count, 0) as word_count,
				left(regexp_replace(coalesce(d.input_text, ''), '\s+', ' ', 'g'), 140) as preview,
				d.classification,
				d.ai_probability::double precision as ai_probability,
				d.created_at
			from public.detections d
			union all
			select
				h.id,
				'humanize'::text,
				coalesce(h.word_count, 0),
				left(regexp_replace(coalesce(h.input_text, ''), '\s+', ' ', 'g'), 140),
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
		select x.id, x.activity_type, x.word_count, x.preview, x.classification, x.ai_probability, x.created_at
		from (
			select
				d.id,
				'detect'::text as activity_type,
				coalesce(d.word_count, 0) as word_count,
				left(regexp_replace(coalesce(d.input_text, ''), '\s+', ' ', 'g'), 140) as preview,
				d.classification,
				d.ai_probability::double precision as ai_probability,
				d.created_at
			from public.detections d
			union all
			select
				h.id,
				'humanize'::text,
				coalesce(h.word_count, 0),
				left(regexp_replace(coalesce(h.input_text, ''), '\s+', ' ', 'g'), 140),
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

grant execute on function public.activity_feed_page(integer, integer, text, boolean) to authenticated;

