-- =====================================================================
-- Storage policies. Run AFTER creating the three public buckets in the
-- Supabase dashboard: questions, reviews, ads.
-- Public read (images must load for students), staff-only write.
-- =====================================================================

create policy "public read questions" on storage.objects
  for select using (bucket_id = 'questions');

create policy "staff upload questions" on storage.objects
  for insert with check (bucket_id = 'questions' and is_staff());

create policy "staff update questions" on storage.objects
  for update using (bucket_id = 'questions' and is_staff());

create policy "staff delete questions" on storage.objects
  for delete using (bucket_id = 'questions' and is_staff());

create policy "public read reviews" on storage.objects
  for select using (bucket_id = 'reviews');

create policy "staff write reviews" on storage.objects
  for all using (bucket_id = 'reviews' and is_staff())
  with check (bucket_id = 'reviews' and is_staff());

create policy "public read ads" on storage.objects
  for select using (bucket_id = 'ads');

create policy "staff write ads" on storage.objects
  for all using (bucket_id = 'ads' and is_staff())
  with check (bucket_id = 'ads' and is_staff());
