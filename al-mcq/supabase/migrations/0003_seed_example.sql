-- Optional: one example paper so the UI is not empty before you upload
-- real content. Delete the paper from /admin/papers when you are done.

insert into papers (title, subject, year, paper_type, description,
                    duration_minutes, total_questions, is_published)
values ('2024 G.C.E. A/L Physics MCQ', 'physics', 2024, 'past',
        'The full fifty-question multiple choice paper, timed as it is sat.',
        60, 50, false)
on conflict do nothing;

insert into advertisements (title, image_url, link_url, placement, is_active, priority)
values ('Example promo', 'https://placehold.co/600x420/5A4BE1/FFFFFF/png?text=Your+ad+here',
        'https://example.com', 'DASHBOARD_PROMO', true, 10)
on conflict do nothing;
