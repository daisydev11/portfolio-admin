-- Run once in your Supabase SQL Editor. No public writes or inbox access.
create table if not exists public.portfolio_pages (
 slug text primary key, content jsonb not null, revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_versions (
 id bigint generated always as identity primary key, slug text not null,
 content jsonb not null, revision integer not null, saved_at timestamptz not null default now()
);
create table if not exists public.portfolio_messages (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null,
 message text not null, is_read boolean not null default false, created_at timestamptz not null default now()
);
alter table public.portfolio_pages enable row level security;
alter table public.portfolio_versions enable row level security;
alter table public.portfolio_messages enable row level security;
revoke all on public.portfolio_pages, public.portfolio_versions, public.portfolio_messages from anon, authenticated;
grant all on public.portfolio_pages, public.portfolio_versions, public.portfolio_messages to service_role;
grant usage, select on sequence public.portfolio_versions_id_seq to service_role;
create or replace function public.save_portfolio_page(p_slug text, p_content jsonb, p_revision integer)
returns setof public.portfolio_pages language plpgsql security invoker as $$
declare old public.portfolio_pages;
begin
 select * into old from public.portfolio_pages where slug=p_slug for update;
 if not found then raise exception 'Page not found'; end if;
 if old.revision <> p_revision then raise exception 'Revision conflict'; end if;
 insert into public.portfolio_versions(slug,content,revision) values(old.slug,old.content,old.revision);
 update public.portfolio_pages set content=p_content, revision=revision+1, updated_at=now() where slug=p_slug;
 return query select * from public.portfolio_pages where slug=p_slug;
end; $$;
revoke all on function public.save_portfolio_page(text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_portfolio_page(text,jsonb,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-images','portfolio-images',true,4194304,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=4194304,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
-- Public image downloads are intentional. Uploads use the protected backend only.
