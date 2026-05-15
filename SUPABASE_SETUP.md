# Supabase setup for the family tree PWA

1. Create a Supabase project.
2. Create a Storage bucket with the same name you will enter in the app (default: `family-tree`).
3. Enable Anonymous Sign-Ins in Supabase Auth.
4. Add storage policies that allow authenticated users to insert, select, update, and delete objects in that bucket.
5. Open the app, enter:
   - Project URL
   - anon / publishable key
   - bucket name
   - shared sync ID
   - 64-character AES key

The app encrypts `data.enc` and `photos.enc` in the browser before upload.
