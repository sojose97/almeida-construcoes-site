-- Enforce the same image restrictions on the server that the admin form shows.
-- Rollback: set file_size_limit and allowed_mime_types to NULL for this bucket.
update storage.buckets
set file_size_limit = 6291456,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';
