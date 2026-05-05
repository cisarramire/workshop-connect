
CREATE TABLE public.review_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by everyone"
  ON public.review_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert own reaction"
  ON public.review_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own reaction"
  ON public.review_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "User can delete own reaction"
  ON public.review_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_review_reactions_review ON public.review_reactions(review_id);
