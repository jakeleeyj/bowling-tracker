-- Create avatars storage bucket (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatars
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update/overwrite their own avatars
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to view avatars (public bucket)
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
