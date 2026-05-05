
CREATE TABLE public.reply_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reply_id, user_id)
);

ALTER TABLE public.reply_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reply reactions viewable by everyone"
  ON public.reply_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert own reply reaction"
  ON public.reply_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own reply reaction"
  ON public.reply_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "User can delete own reply reaction"
  ON public.reply_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_reply_reactions_reply ON public.reply_reactions(reply_id);
