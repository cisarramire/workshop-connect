import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  MapPin,
  Phone,
  Globe,
  Wrench,
  MessageSquare,
  Trash2,
  Pencil,
  Flag,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { StarRating } from "@/components/StarRating";
import { PhotoGallery, Lightbox } from "@/components/PhotoGallery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/workshops/$slug")({
  component: WorkshopDetail,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Workshop not found</h1>
      <Button asChild className="mt-6">
        <Link to="/">Browse all workshops</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
});

type Workshop = {
  id: string;
  created_by: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string;
  photo_url: string | null;
  photos: string[];
  specialties: string[];
};

type Profile = { id: string; display_name: string; avatar_url: string | null };

type Review = {
  id: string;
  workshop_id: string;
  author_id: string;
  rating: number;
  service_type: string | null;
  body: string;
  created_at: string;
};

type Comment = {
  id: string;
  review_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type Reply = {
  id: string;
  review_id: string;
  workshop_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type ReplyComment = {
  id: string;
  reply_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  service_type: z.string().trim().max(40).optional().or(z.literal("")),
  body: z.string().trim().min(10, "At least 10 characters").max(2000),
});

function WorkshopDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyComments, setReplyComments] = useState<ReplyComment[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const { data: w } = await supabase
      .from("workshops")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!w) {
      setLoading(false);
      throw notFound();
    }
    setWorkshop(w as Workshop);

    const { data: rs } = await supabase
      .from("reviews")
      .select("*")
      .eq("workshop_id", w.id)
      .order("created_at", { ascending: false });
    const reviewList = (rs ?? []) as Review[];
    setReviews(reviewList);

    const reviewIds = reviewList.map((r) => r.id);
    let commentList: Comment[] = [];
    let replyList: Reply[] = [];
    let replyCommentList: ReplyComment[] = [];
    if (reviewIds.length) {
      const [{ data: cs }, { data: rps }] = await Promise.all([
        supabase
          .from("review_comments")
          .select("*")
          .in("review_id", reviewIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("review_replies")
          .select("*")
          .in("review_id", reviewIds)
          .order("created_at", { ascending: true }),
      ]);
      commentList = (cs ?? []) as Comment[];
      replyList = (rps ?? []) as Reply[];

      const replyIds = replyList.map((r) => r.id);
      if (replyIds.length) {
        const { data: rcs } = await supabase
          .from("reply_comments")
          .select("*")
          .in("reply_id", replyIds)
          .order("created_at", { ascending: true });
        replyCommentList = (rcs ?? []) as ReplyComment[];
      }
    }
    setComments(commentList);
    setReplies(replyList);
    setReplyComments(replyCommentList);

    const ids = Array.from(
      new Set([
        w.created_by,
        ...reviewList.map((r) => r.author_id),
        ...commentList.map((c) => c.author_id),
        ...replyList.map((r) => r.author_id),
        ...replyCommentList.map((c) => c.author_id),
      ]),
    );
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", ids);
      const map = new Map<string, Profile>();
      ps?.forEach((p) => map.set(p.id, p as Profile));
      setProfiles(map);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    loadAll().catch(() => setLoading(false));
  }, [loadAll]);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0, breakdown: [0, 0, 0, 0, 0] };
    const breakdown = [0, 0, 0, 0, 0];
    let sum = 0;
    reviews.forEach((r) => {
      breakdown[r.rating - 1]++;
      sum += r.rating;
    });
    return { avg: sum / reviews.length, count: reviews.length, breakdown };
  }, [reviews]);

  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.author_id === user.id) ?? null : null),
    [reviews, user],
  );

  if (loading || !workshop) {
    return (
      <main className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Loading…
      </main>
    );
  }

  const owner = profiles.get(workshop.created_by);

  const deleteWorkshop = async () => {
    const { error } = await supabase.from("workshops").delete().eq("id", workshop.id);
    if (error) return toast.error(error.message);
    toast.success("Workshop deleted");
    navigate({ to: "/" });
  };

  return (
    <main>
      {/* Header */}
      <section className="border-b border-border bg-gradient-to-b from-accent/30 to-background">
        <div className="container mx-auto grid gap-8 px-4 py-10 md:grid-cols-[1fr_400px]">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {workshop.city}
              {workshop.address && <span>• {workshop.address}</span>}
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{workshop.name}</h1>

            <div className="mt-4 flex items-center gap-3">
              {stats.count > 0 ? (
                <>
                  <StarRating value={stats.avg} size={20} />
                  <span className="text-2xl font-bold">{stats.avg.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    · {stats.count} review{stats.count === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">No reviews yet — be the first.</span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {workshop.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>

            <p className="mt-6 max-w-2xl whitespace-pre-line text-foreground/90">
              {workshop.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {workshop.phone && (
                <a href={`tel:${workshop.phone}`} className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary">
                  <Phone className="h-4 w-4" /> {workshop.phone}
                </a>
              )}
              {workshop.website && (
                <a
                  href={workshop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"
                >
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              Added by {owner?.display_name ?? "someone"}
              {user?.id === workshop.created_by && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this workshop?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will also remove all reviews and comments. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteWorkshop}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <ReportButton targetType="workshop" targetId={workshop.id} />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            {gallery.length > 0 ? (
              <button
                type="button"
                onClick={() => setLightboxStart(0)}
                className="block w-full focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Open photo gallery"
              >
                <img
                  src={gallery[0]}
                  alt={workshop.name}
                  className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </button>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-accent text-primary/40">
                <Wrench className="h-20 w-20" />
              </div>
            )}
            {gallery.length > 1 && (
              <div className="border-t border-border p-3">
                <PhotoGallery photos={gallery} alt={workshop.name} />
              </div>
            )}
            {stats.count > 0 && (
              <div className="space-y-1.5 border-t border-border p-5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = stats.breakdown[n - 1];
                  const pct = stats.count ? (c / stats.count) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-3 font-medium">{n}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[var(--rating)]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-muted-foreground">{c}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {lightboxStart !== null && (
            <FullscreenLightbox
              photos={gallery}
              startIndex={lightboxStart}
              alt={workshop.name}
              onClose={() => setLightboxStart(null)}
            />
          )}
        </div>
      </section>

      {/* Review form */}
      <section className="container mx-auto max-w-3xl px-4 py-10">
        <h2 className="font-display text-2xl font-semibold">
          {myReview ? "Your review" : "Leave a review"}
        </h2>
        {user ? (
          <ReviewForm
            workshopId={workshop.id}
            existing={myReview}
            onSaved={loadAll}
          />
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card p-5 text-sm">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>{" "}
            to leave a review.
          </div>
        )}

        {/* Reviews list */}
        <h2 className="mt-12 font-display text-2xl font-semibold">All reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {reviews.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                comments={comments.filter((c) => c.review_id === r.id)}
                profiles={profiles}
                onChange={loadAll}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ReviewForm({
  workshopId,
  existing,
  onSaved,
}: {
  workshopId: string;
  existing: Review | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [serviceType, setServiceType] = useState(existing?.service_type ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setServiceType(existing?.service_type ?? "");
    setBody(existing?.body ?? "");
  }, [existing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = reviewSchema.safeParse({ rating, service_type: serviceType, body });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    const payload = {
      workshop_id: workshopId,
      author_id: user.id,
      rating: parsed.data.rating,
      service_type: parsed.data.service_type || null,
      body: parsed.data.body,
    };
    const { error } = existing
      ? await supabase.from("reviews").update(payload).eq("id", existing.id)
      : await supabase.from("reviews").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Review updated" : "Review posted");
    onSaved();
  };

  const remove = async () => {
    if (!existing) return;
    const { error } = await supabase.from("reviews").delete().eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Your rating:</span>
        <StarRating value={rating} size={24} onChange={setRating} />
      </div>
      <div className="mt-4 space-y-1.5">
        <label className="text-sm font-medium">Service type (optional)</label>
        <Input
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          placeholder="e.g. brake replacement"
          maxLength={40}
        />
      </div>
      <div className="mt-4 space-y-1.5">
        <label className="text-sm font-medium">Your experience</label>
        <Textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened? Was the work good? Fair price?"
          maxLength={2000}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button type="submit" disabled={busy || rating === 0}>
          {busy ? "Saving…" : existing ? "Update review" : "Post review"}
        </Button>
        {existing && (
          <Button type="button" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    </form>
  );
}

function ReviewItem({
  review,
  comments,
  profiles,
  onChange,
}: {
  review: Review;
  comments: Comment[];
  profiles: Map<string, Profile>;
  onChange: () => void;
}) {
  const { user } = useAuth();
  const [showComment, setShowComment] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const author = profiles.get(review.author_id);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const text = commentBody.trim();
    if (text.length < 1 || text.length > 1000) {
      return toast.error("Comment must be 1–1000 characters");
    }
    setBusy(true);
    const { error } = await supabase.from("review_comments").insert({
      review_id: review.id,
      author_id: user.id,
      body: text,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCommentBody("");
    setShowComment(false);
    onChange();
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("review_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback>{(author?.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{author?.display_name ?? "Someone"}</span>
            <StarRating value={review.rating} size={14} />
            {review.service_type && (
              <Badge variant="outline" className="font-normal">
                {review.service_type}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-foreground/90">{review.body}</p>

          <div className="mt-3 flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setShowComment((v) => !v)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Reply
              </Button>
            )}
            <ReportButton targetType="review" targetId={review.id} />
          </div>

          {showComment && (
            <form onSubmit={postComment} className="mt-3 flex gap-2">
              <Input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a reply…"
                maxLength={1000}
              />
              <Button type="submit" size="icon" disabled={busy}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}

          {comments.length > 0 && (
            <ul className="mt-4 space-y-3 border-l-2 border-border pl-4">
              {comments.map((c) => {
                const a = profiles.get(c.author_id);
                return (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a?.display_name ?? "Someone"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      {user?.id === c.author_id && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-foreground/90">{c.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "workshop" | "review" | "comment";
  targetId: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async () => {
    const r = reason.trim();
    if (r.length < 5 || r.length > 500) return toast.error("Reason must be 5–500 chars");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: r,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reported. Thanks for flagging.");
    setOpen(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive">
          <Flag className="h-3.5 w-3.5" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>Tell us what's wrong. Our team will review.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you reporting this?"
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
