-- Allow admins to deactivate accounts (block app access).

alter table public.profiles
	add column if not exists disabled boolean not null default false;

alter table public.profiles
	add column if not exists disabled_at timestamptz;

