-- 1. Photo gallery: store multiple photos per workshop
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill: include existing photo_url as the first gallery photo
UPDATE public.workshops
SET photos = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND (photos IS NULL OR array_length(photos, 1) IS NULL);

-- 2. Owner replies to reviews (one reply per review, by the workshop owner)
CREATE TABLE public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE,
  workshop_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can read replies
CREATE POLICY "Replies are viewable by everyone"
  ON public.review_replies FOR SELECT USING (true);

-- Only the workshop owner may insert a reply, and they must be the author
CREATE POLICY "Workshop owner can insert reply"
  ON public.review_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.workshops w
      WHERE w.id = review_replies.workshop_id
        AND w.created_by = auth.uid()
    )
  );

CREATE POLICY "Author can update own reply"
  ON public.review_replies FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Author can delete own reply"
  ON public.review_replies FOR DELETE
  USING (auth.uid() = author_id);

CREATE TRIGGER update_review_replies_updated_at
  BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Comments on owner replies (any authenticated user)
CREATE TABLE public.reply_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reply_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reply comments are viewable by everyone"
  ON public.reply_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert reply comment"
  ON public.reply_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author can update own reply comment"
  ON public.reply_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Author can delete own reply comment"
  ON public.reply_comments FOR DELETE
  USING (auth.uid() = author_id);
