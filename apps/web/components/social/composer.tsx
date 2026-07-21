"use client";

import { api } from "@/lib/api";
import { LIMITS, isImageMimeType, type FeedPost } from "@aura/shared";
import { useRef, useState } from "react";
import { useSession } from "./session-provider";
import { Avatar } from "@/components/site-chrome";

export function Composer({
  replyToPostId,
  repostOfPostId,
  context,
  compact = false,
  onPosted,
}: {
  replyToPostId?: string;
  repostOfPostId?: string;
  context?: string;
  compact?: boolean;
  onPosted?: (post: FeedPost) => void;
}) {
  const { user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function choose(file?: File) {
    if (!file) return;
    if (!isImageMimeType(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > LIMITS.imageMaxBytes) {
      setError("Images must be 8 MB or smaller.");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }
  async function submit() {
    if (!user) return setError("Select a Development session user.");
    if (body.trim().length > 500)
      return setError("Posts are limited to 500 characters.");
    if (!body.trim() && !image && !repostOfPostId)
      return setError("Write something or add an image.");
    setPending(true);
    setError("");
    try {
      let payload: BodyInit;
      if (image) {
        const form = new FormData();
        form.set("body", body);
        form.set("image", image);
        if (replyToPostId) form.set("replyToPostId", replyToPostId);
        if (repostOfPostId) form.set("repostOfPostId", repostOfPostId);
        payload = form;
      } else
        payload = JSON.stringify({
          body: body.trim() || null,
          replyToPostId,
          repostOfPostId,
        });
      const result = await api<{ data: FeedPost }>("/v1/posts", {
        method: "POST",
        body: payload,
      });
      setBody("");
      setImage(null);
      setPreview("");
      onPosted?.(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to post.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className={`border-b border-white/[.07] ${compact ? "p-4" : "p-5"}`}
      aria-label={replyToPostId ? "Write a comment" : "Create post"}
    >
      {context && <p className="mb-3 ml-14 text-xs text-zinc-600">{context}</p>}
      <div className="flex gap-3">
        {user ? (
          <Avatar user={user} />
        ) : (
          <span className="h-11 w-11 rounded-full bg-white/[.05]" />
        )}
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError("");
            }}
            maxLength={500}
            rows={compact ? 2 : 4}
            placeholder={
              replyToPostId
                ? "Write a thoughtful reply…"
                : "Share something with the culture…"
            }
            className="w-full resize-none bg-transparent text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-700"
          />
          {preview && (
            <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={preview}
                alt="Post upload preview"
                className="max-h-96 w-full object-cover"
              />
              <button
                onClick={() => {
                  setImage(null);
                  setPreview("");
                }}
                className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"
                aria-label="Remove image"
              >
                Remove
              </button>
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-3">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => choose(e.target.files?.[0])}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-lg px-2 py-1 text-sm text-violet-300 hover:bg-violet-400/10"
                aria-label="Add image"
              >
                ▧ Image
              </button>
              <span
                className={`text-xs ${body.length > 450 ? "text-amber-300" : "text-zinc-700"}`}
              >
                {body.length}/500
              </span>
            </div>
            <button
              onClick={submit}
              disabled={pending || (!body.trim() && !image && !repostOfPostId)}
              className="h-9 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {pending ? "Posting…" : replyToPostId ? "Reply" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
