"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_TAGS = 10;
const TAG_MAX_LEN = 30;

// ─── UploadForm ───────────────────────────────────────────────────────────────

interface UploadFormProps {
  userId: string;
}

type Status = "idle" | "uploading" | "saving" | "done";

export function UploadForm({ userId }: UploadFormProps) {
  const router = useRouter();

  // form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [repoType, setRepoType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // submission state
  const [status, setStatus] = useState<Status>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // auto-generate slug from title unless user edited it
  useEffect(() => {
    if (!slugTouched) {
      setSlug(toSlug(title));
    }
  }, [title, slugTouched]);

  // ── tag helpers ─────────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!value || tags.includes(value) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, value.slice(0, TAG_MAX_LEN)]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  // ── file helpers ─────────────────────────────────────────────────────────────

  function validateAndSetFile(f: File) {
    if (!f.name.endsWith(".zip")) {
      setError("Only ZIP archives are allowed");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum ${formatBytes(MAX_FILE_SIZE)}`);
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }

  // ── validation ───────────────────────────────────────────────────────────────

  function validate() {
    if (!title.trim()) return "Title is required";
    if (!slug) return "Slug cannot be empty";
    if (!/^[a-z0-9-]{1,80}$/.test(slug))
      return "Slug: lowercase letters, digits and hyphens, up to 80 characters";
    if (repoType === "paid") {
      const p = parseFloat(price);
      if (!price || isNaN(p) || p <= 0) return "Enter a price greater than zero";
      if (p > 9999) return "Maximum price is $9,999";
    }
    return null;
  }

  // ── fake progress ─────────────────────────────────────────────────────────────

  function startFakeProgress() {
    setUploadProgress(0);
    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      current = Math.min(current + Math.random() * 12 + 3, 88);
      setUploadProgress(Math.round(current));
    }, 250);
  }

  function stopFakeProgress(done = true) {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (done) setUploadProgress(100);
  }

  // ── submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const supabase = createClient();
    const repoId = crypto.randomUUID();
    let storagePath: string | null = null;

    try {
      // ── 1. Upload file to Storage ──────────────────────────────────────────
      if (file) {
        setStatus("uploading");
        startFakeProgress();

        storagePath = `${userId}/${repoId}/source.zip`;

        const { error: uploadError } = await supabase.storage
          .from("repositories")
          .upload(storagePath, file, {
            contentType: "application/zip",
            upsert: false,
          });

        stopFakeProgress(true);

        if (uploadError) {
          setStatus("idle");
          setError(`File upload error: ${uploadError.message}`);
          return;
        }
      }

      // ── 2. Insert repository record ───────────────────────────────────────
      setStatus("saving");

      const priceCents =
        repoType === "paid" ? Math.round(parseFloat(price) * 100) : null;

      const { error: dbError } = await supabase
        .from("repositories")
        .insert({
          id: repoId,
          owner_id: userId,
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          type: repoType,
          price_cents: priceCents,
          storage_path: storagePath,
          tags,
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
        });

      if (dbError) {
        // rollback Storage upload
        if (storagePath) {
          await supabase.storage.from("repositories").remove([storagePath]);
        }
        setStatus("idle");
        setError(
          dbError.code === "23505"
            ? "A repository with this slug already exists"
            : dbError.message,
        );
        return;
      }

      setStatus("done");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      stopFakeProgress(false);
      setStatus("idle");
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  }

  const isSubmitting = status === "uploading" || status === "saving";

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <form className="flex flex-col gap-8">
      {/* ── Section: Basics ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Basics
        </h2>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="My Awesome Vibe"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">
            Slug{" "}
            <span className="font-normal text-muted-foreground">
              (repository URL)
            </span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground select-none">
              vibehub.io/
            </span>
            <Input
              id="slug"
              className="pl-[5.5rem]"
              placeholder="my-awesome-vibe"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 80),
                );
              }}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">
            Description{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="description"
            placeholder="What does this code do? Who is it useful for?"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/1000
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tag-input">
            Tags{" "}
            <span className="font-normal text-muted-foreground">
              (up to {MAX_TAGS})
            </span>
          </Label>
          <div
            className={cn(
              "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 transition-colors dark:bg-input/30",
              "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            )}
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  disabled={isSubmitting}
                  className="opacity-60 hover:opacity-100 transition-opacity leading-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                ref={tagInputRef}
                id="tag-input"
                type="text"
                className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={tags.length === 0 ? "react, nextjs, ui…" : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.replace(",", ""))}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput) addTag(tagInput); }}
                disabled={isSubmitting}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter or comma to add a tag
          </p>
        </div>
      </section>

      {/* ── Section: Monetization ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Monetization
        </h2>

        {/* Type toggle */}
        <div className="flex flex-col gap-2">
          <Label>Repository type</Label>
          <div className="flex gap-2">
            {(["free", "paid"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRepoType(t)}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  repoType === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "free" ? "Free" : "Paid"}
              </button>
            ))}
          </div>
        </div>

        {/* Price — conditionally rendered */}
        {repoType === "paid" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Price (USD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground select-none">
                $
              </span>
              <Input
                id="price"
                type="number"
                className="pl-6"
                placeholder="9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0.01"
                max="9999"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Section: Source code ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Source code
        </h2>

        <div className="flex flex-col gap-2">
          <Label>ZIP archive</Label>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Select ZIP file"
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              isDragging
                ? "border-foreground bg-muted/50"
                : file
                  ? "border-border bg-muted/30"
                  : "border-border hover:border-muted-foreground/50",
              isSubmitting && "pointer-events-none opacity-60",
            )}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center gap-3 px-6 text-sm">
                <ZipIcon className="size-8 shrink-0 text-muted-foreground" />
                <div className="overflow-hidden">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove file"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <UploadIcon className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragging ? "Drop the file" : "Drag & drop ZIP or click"}
                </p>
                <p className="text-xs text-muted-foreground">
                  .zip, max {formatBytes(MAX_FILE_SIZE)}
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
        </div>
      </section>

      {/* ── Upload progress ── */}
      {status === "uploading" && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading file…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={(e) => handleSubmit(e, false)}
          className="flex-1"
        >
          {status === "saving" ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => handleSubmit(e, true)}
          className="flex-1"
        >
          {status === "uploading"
            ? "Uploading…"
            : status === "saving"
              ? "Publishing…"
              : "Publish"}
        </Button>
      </div>
    </form>
  );
}

// ─── Inline icons (lucide shapes, no extra import) ────────────────────────────

function UploadIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ZipIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <polyline points="9 15 12 18 15 15" />
    </svg>
  );
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
