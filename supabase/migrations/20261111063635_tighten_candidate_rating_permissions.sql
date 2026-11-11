/*
# Tighten candidate rating permissions

1. Changes
- Keep `SELECT` and `INSERT` access on `candidate_ratings` for the current no-sign-in app.
- Remove unnecessary `UPDATE` and `DELETE` table privileges from anon and authenticated roles.

2. Security
- Recruiters can add and view ratings, but cannot alter or remove an existing review, its reviewer name, or its timestamp through the client.
*/

REVOKE UPDATE, DELETE ON public.candidate_ratings FROM anon, authenticated;
GRANT SELECT, INSERT ON public.candidate_ratings TO anon, authenticated;
