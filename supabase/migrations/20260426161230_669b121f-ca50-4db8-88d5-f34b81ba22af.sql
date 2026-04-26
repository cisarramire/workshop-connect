
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- WORKSHOPS
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  city text not null,
  address text,
  phone text,
  website text,
  description text not null,
  photo_url text,
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workshops enable row level security;
create index workshops_city_idx on public.workshops (lower(city));
create index workshops_created_at_idx on public.workshops (created_at desc);

create policy "Workshops are viewable by everyone"
  on public.workshops for select using (true);
create policy "Authenticated can insert workshops"
  on public.workshops for insert
  to authenticated
  with check (auth.uid() = created_by);
create policy "Owner can update workshop"
  on public.workshops for update using (auth.uid() = created_by);
create policy "Owner can delete workshop"
  on public.workshops for delete using (auth.uid() = created_by);

create trigger workshops_set_updated_at
  before update on public.workshops
  for each row execute function public.set_updated_at();

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  service_type text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, author_id)
);
alter table public.reviews enable row level security;
create index reviews_workshop_idx on public.reviews (workshop_id, created_at desc);

create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);
create policy "Authenticated can insert review"
  on public.reviews for insert to authenticated
  with check (auth.uid() = author_id);
create policy "Author can update review"
  on public.reviews for update using (auth.uid() = author_id);
create policy "Author can delete review"
  on public.reviews for delete using (auth.uid() = author_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- COMMENTS
create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.review_comments enable row level security;
create index review_comments_review_idx on public.review_comments (review_id, created_at);

create policy "Comments are viewable by everyone"
  on public.review_comments for select using (true);
create policy "Authenticated can insert comment"
  on public.review_comments for insert to authenticated
  with check (auth.uid() = author_id);
create policy "Author can update comment"
  on public.review_comments for update using (auth.uid() = author_id);
create policy "Author can delete comment"
  on public.review_comments for delete using (auth.uid() = author_id);

-- REPORTS
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('workshop','review','comment')),
  target_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

create policy "Reporter can read own reports"
  on public.reports for select using (auth.uid() = reporter_id);
create policy "Authenticated can insert report"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Storage bucket for workshop photos
insert into storage.buckets (id, name, public)
values ('workshop-photos', 'workshop-photos', true)
on conflict (id) do nothing;

create policy "Workshop photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'workshop-photos');
create policy "Authenticated can upload workshop photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'workshop-photos');
create policy "Owner can update own workshop photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'workshop-photos' and owner = auth.uid());
create policy "Owner can delete own workshop photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'workshop-photos' and owner = auth.uid());
