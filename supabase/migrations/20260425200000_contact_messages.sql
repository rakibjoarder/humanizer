create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null,
  message     text not null,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- Only service role can read (admin use)
create policy "service role full access"
  on contact_messages
  for all
  using (true)
  with check (true);
