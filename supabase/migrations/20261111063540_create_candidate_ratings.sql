/*
# Create shared candidate ratings

1. New Tables
- `candidate_ratings`
- `id` (uuid, primary key) uniquely identifies a rating.
- `candidate_key` (text) identifies the candidate using the existing app record's phone or email.
- `candidate_name` (text) stores the display name shown with the rating.
- `reviewer_name` (text) stores the recruiter name entered when feedback is submitted.
- `rating` (integer) stores a whole-number score from 1 to 5.
- `feedback` (text) stores optional recruiter feedback.
- `created_at` (timestamptz) records when the feedback was submitted.

2. Modified Tables
- None.

3. Security
- Row level security is enabled on `candidate_ratings`.
- The no-sign-in recruiter app can read and create shared ratings through the anon and authenticated roles.
- Ratings cannot be edited or deleted from the client, preserving the original reviewer and timestamp.

4. Important Notes
- Ratings are intentionally shared because the current app has no sign-in flow.
- A candidate key is derived from the existing candidate phone or email and is not exposed as a separate candidate table.
*/

CREATE TABLE IF NOT EXISTS public.candidate_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_key text NOT NULL,
  candidate_name text NOT NULL,
  reviewer_name text NOT NULL CHECK (char_length(trim(reviewer_name)) BETWEEN 1 AND 120),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback text NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_ratings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.candidate_ratings TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read candidate ratings" ON public.candidate_ratings;
CREATE POLICY "Anyone can read candidate ratings"
  ON public.candidate_ratings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can add candidate ratings" ON public.candidate_ratings;
CREATE POLICY "Anyone can add candidate ratings"
  ON public.candidate_ratings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(reviewer_name)) BETWEEN 1 AND 120
    AND rating BETWEEN 1 AND 5
    AND char_length(feedback) <= 2000
  );

CREATE INDEX IF NOT EXISTS candidate_ratings_candidate_key_created_at_idx
  ON public.candidate_ratings (candidate_key, created_at DESC);
