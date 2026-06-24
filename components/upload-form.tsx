"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/pixel-toast";
import { cn } from "@/lib/utils";
import { containsBanned, BANNED_MESSAGE } from "@/lib/banned-words";
import { scanAiSignals, SIGNAL_TEXT_FILES } from "@/lib/ai-signals";
import { scanCode, shouldScan, SECURITY_CATALOG, SEVERITY_STYLE } from "@/lib/security-scan";
import { extractDeps, MANIFEST_FILES } from "@/lib/deps";
import { VulnFinding } from "@/components/vuln-finding";
import type { Repository } from "@/types/database";

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

const AI_PRESETS = ["Claude", "ChatGPT", "Cursor", "v0", "Copilot", "Gemini", "Lovable", "Bolt"];
const MAX_AI_TOOLS = 8;

// ─── UploadForm ───────────────────────────────────────────────────────────────

interface UploadFormProps {
  userId: string;
}

type Status = "idle" | "uploading" | "saving" | "done";

export function UploadForm({ userId }: UploadFormProps) {
  const router = useRouter();
  const toast  = useToast();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  // form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [repoType, setRepoType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [fileManifest, setFileManifest] = useState<string[]>([]);
  const [securityFlags, setSecurityFlags] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [vulnFindings, setVulnFindings] = useState<string[]>([]);
  const [scanningVuln, setScanningVuln] = useState(false);
  const [aiSignals, setAiSignals] = useState<string[]>([]);

  // edit-mode state
  const [editLoading, setEditLoading] = useState(isEdit);
  const [editForbidden, setEditForbidden] = useState(false);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);
  const [existingPublishedAt, setExistingPublishedAt] = useState<string | null>(null);

  // Load the repository when editing.
  useEffect(() => {
    if (!editId) return;
    const supabase = createClient();
    let active = true;
    supabase
      .from("repositories")
      .select("*")
      .eq("id", editId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const r = data as Repository | null;
        if (!r) { setEditForbidden(true); setEditLoading(false); return; }
        if (r.owner_id !== userId) { setEditForbidden(true); setEditLoading(false); return; }
        setTitle(r.title);
        setSlug(r.slug);
        setSlugTouched(true);
        setDescription(r.description ?? "");
        setCategory(r.category ?? "");
        setRepoType(r.type);
        setPrice(r.price_cents ? (r.price_cents / 100).toString() : "");
        setTags(r.tags ?? []);
        setAiTools(r.ai_tools ?? []);
        setDemoUrl(r.demo_url ?? "");
        setPreviewImages(r.preview_images ?? []);
        setFileManifest(r.file_manifest ?? []);
        setSecurityFlags(r.security_flags ?? []);
        setVulnFindings(r.vuln_findings ?? []);
        setAiSignals(r.ai_signals ?? []);
        setExistingStoragePath(r.storage_path);
        setExistingPublishedAt(r.published_at);
        setEditLoading(false);
      });
    return () => { active = false; };
  }, [editId, userId]);

  // submission state
  const [status, setStatus] = useState<Status>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── AI tools helpers ──────────────────────────────────────────────────────────

  function toggleAiTool(tool: string) {
    setAiTools((prev) =>
      prev.includes(tool)
        ? prev.filter((t) => t !== tool)
        : prev.length >= MAX_AI_TOOLS
          ? prev
          : [...prev, tool],
    );
  }

  function addAiTool(raw: string) {
    const value = raw.trim().slice(0, 30);
    if (!value || aiTools.some((t) => t.toLowerCase() === value.toLowerCase()) || aiTools.length >= MAX_AI_TOOLS) return;
    setAiTools((prev) => [...prev, value]);
    setAiInput("");
  }

  function removeAiTool(tool: string) {
    setAiTools((prev) => prev.filter((t) => t !== tool));
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
    parseManifest(f);
  }

  // Read the file list out of the ZIP so the listing can show a file tree.
  // JSZip is imported lazily so it stays out of the main bundle.
  async function parseManifest(f: File) {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(f);
      const paths: string[] = [];
      zip.forEach((relativePath, entry) => { if (!entry.dir) paths.push(relativePath); });
      paths.sort();
      setFileManifest(paths);

      // Read a few key files for content-based AI signals (e.g. v0 keeps its
      // sandbox files gitignored, so the only trace is inside .gitignore).
      const texts: string[] = [];
      for (const p of paths) {
        const base = p.split("/").pop()?.toLowerCase();
        if (base && SIGNAL_TEXT_FILES.includes(base)) {
          try { texts.push(await zip.file(p)!.async("string")); } catch { /* ignore */ }
        }
      }
      setAiSignals(scanAiSignals(paths, texts));

      // Heuristic security scan: read code files (bounded) and flag patterns.
      setScanning(true);
      const codeFiles: { path: string; content: string }[] = [];
      let budget = 3_000_000;
      for (const p of paths) {
        if (codeFiles.length >= 400 || budget <= 0) break;
        if (!shouldScan(p)) continue;
        try {
          const content = await zip.file(p)!.async("string");
          if (content.length > 200_000) continue;
          budget -= content.length;
          codeFiles.push({ path: p, content });
        } catch { /* ignore */ }
      }
      setSecurityFlags(scanCode(codeFiles).map((flag) => flag.id));
      setScanning(false);

      // Dependency vulnerabilities via OSV.dev across ecosystems (npm, PyPI, Go,
      // crates.io, RubyGems, Packagist). Best-effort — never blocks the upload.
      try {
        const manifests: { name: string; content: string }[] = [];
        for (const p of paths) {
          if (manifests.length >= 16) break;
          const base = p.split("/").pop()?.toLowerCase();
          if (base && MANIFEST_FILES.includes(base)) {
            try {
              const content = await zip.file(p)!.async("string");
              if (content.length <= 4_000_000) manifests.push({ name: base, content });
            } catch { /* ignore */ }
          }
        }
        const deps = extractDeps(manifests);
        if (deps.length > 0) {
          setScanningVuln(true);
          const res = await fetch("/api/osv-scan", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ deps }),
          });
          const json = await res.json();
          setVulnFindings(Array.isArray(json?.findings) ? json.findings : []);
          setScanningVuln(false);
        } else {
          setVulnFindings([]);
        }
      } catch { setVulnFindings([]); setScanningVuln(false); }
    } catch {
      setFileManifest([]);
      setAiSignals([]);
      setSecurityFlags([]);
      setVulnFindings([]);
      setScanning(false);
      setScanningVuln(false);
    }
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

  // ── preview screenshots ──────────────────────────────────────────────────────

  const MAX_PREVIEWS = 6;

  async function handlePreviewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setPreviewUploading(true);
    const supabase = createClient();
    const slots = MAX_PREVIEWS - previewImages.length;
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, Math.max(0, slots))) {
      if (!f.type.startsWith("image/")) continue;
      const ext = f.name.split(".").pop() ?? "png";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("repo-previews")
        .upload(path, f, { contentType: f.type });
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from("repo-previews").getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    setPreviewImages((prev) => [...prev, ...urls]);
    setPreviewUploading(false);
    e.target.value = "";
  }

  // ── validation ───────────────────────────────────────────────────────────────

  function validate() {
    if (!title.trim()) return "Title is required";
    if (!slug) return "Slug cannot be empty";
    if (!/^[a-z0-9-]{1,80}$/.test(slug))
      return "Slug: lowercase letters, digits and hyphens, up to 80 characters";
    if (containsBanned(title, slug, description, demoUrl, tags)) return BANNED_MESSAGE;
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
    const priceCents =
      repoType === "paid" ? Math.round(parseFloat(price) * 100) : null;

    try {
      // ════ EDIT: update metadata + (if a new ZIP is attached) a new version ════
      if (isEdit && editId) {
        let newStoragePath = existingStoragePath;

        if (file) {
          setStatus("uploading");
          startFakeProgress();
          const versionId = crypto.randomUUID();
          const path = `${userId}/${editId}/${versionId}.zip`;
          const { error: upErr } = await supabase.storage
            .from("repositories")
            .upload(path, file, { contentType: "application/zip", upsert: false });
          stopFakeProgress(true);
          if (upErr) { setStatus("idle"); setError(`File upload error: ${upErr.message}`); return; }

          // next version label = vN
          const { count } = await supabase
            .from("repository_versions")
            .select("id", { count: "exact", head: true })
            .eq("repository_id", editId);

          const { error: vErr } = await supabase.from("repository_versions").insert({
            repository_id: editId,
            version: `v${(count ?? 0) + 1}`,
            changelog: changelog.trim() || null,
            storage_path: path,
          });
          if (vErr) {
            await supabase.storage.from("repositories").remove([path]);
            setStatus("idle"); setError(vErr.message); return;
          }
          newStoragePath = path;
        }

        setStatus("saving");
        const { error: dbError } = await supabase
          .from("repositories")
          .update({
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            type: repoType,
            price_cents: priceCents,
            storage_path: newStoragePath,
            tags,
            category: category || null,
            ai_tools: aiTools,
            ai_assisted: aiTools.length > 0,
            demo_url: demoUrl.trim() || null,
            preview_images: previewImages,
            file_manifest: fileManifest,
            security_flags: securityFlags,
            vuln_findings: vulnFindings,
            ai_signals: aiSignals,
            is_published: publish,
            published_at: publish ? (existingPublishedAt ?? new Date().toISOString()) : existingPublishedAt,
          })
          .eq("id", editId);

        if (dbError) {
          setStatus("idle");
          setError(dbError.code === "23505" ? "A repository with this slug already exists" : dbError.message);
          return;
        }

        setStatus("done");
        toast.success(file ? "New version published!" : "Repository updated");
        router.push(`/listing/${editId}`);
        router.refresh();
        return;
      }

      // ════ CREATE ═══════════════════════════════════════════════════════════
      const repoId = crypto.randomUUID();
      let storagePath: string | null = null;

      if (file) {
        setStatus("uploading");
        startFakeProgress();
        const versionId = crypto.randomUUID();
        storagePath = `${userId}/${repoId}/${versionId}.zip`;
        const { error: uploadError } = await supabase.storage
          .from("repositories")
          .upload(storagePath, file, { contentType: "application/zip", upsert: false });
        stopFakeProgress(true);
        if (uploadError) { setStatus("idle"); setError(`File upload error: ${uploadError.message}`); return; }
      }

      setStatus("saving");
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
          category: category || null,
          ai_tools: aiTools,
          ai_assisted: aiTools.length > 0,
          demo_url: demoUrl.trim() || null,
          preview_images: previewImages,
          file_manifest: fileManifest,
          security_flags: securityFlags,
          vuln_findings: vulnFindings,
          ai_signals: aiSignals,
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
        });

      if (dbError) {
        if (storagePath) await supabase.storage.from("repositories").remove([storagePath]);
        setStatus("idle");
        setError(dbError.code === "23505" ? "A repository with this slug already exists" : dbError.message);
        return;
      }

      // record the first version
      if (storagePath) {
        await supabase.from("repository_versions").insert({
          repository_id: repoId,
          version: "v1",
          changelog: changelog.trim() || "Initial release",
          storage_path: storagePath,
        });
      }

      setStatus("done");
      toast.success("Repository published!", "Your project is now live on Vydex.");
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

  if (editLoading) {
    return <p className="font-mono text-sm text-muted-foreground">Loading<span className="blink">_</span></p>;
  }
  if (editForbidden) {
    return (
      <div className="border-2 border-border bg-card p-8 text-center">
        <p className="font-pixel text-xs text-muted-foreground">You can only edit your own repositories.</p>
      </div>
    );
  }

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
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              if (!slugTouched) setSlug(toSlug(v));
            }}
            maxLength={120}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <Label>
            Category{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: "apps", icon: "▢", label: "Apps" },
              { value: "ui-components", icon: "◧", label: "UI Components" },
              { value: "prompts", icon: "☰", label: "Prompts" },
              { value: "templates", icon: "▦", label: "Templates" },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(category === c.value ? "" : c.value)}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 border-2 px-3 py-2.5 text-sm transition-colors outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  category === c.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                <span className="font-pixel text-base">{c.icon}</span>
                <span className="font-mono text-xs">{c.label}</span>
              </button>
            ))}
          </div>
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
              vydex.dev/
            </span>
            <Input
              id="slug"
              className="pl-[6.5rem]"
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

        {/* Live demo URL */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-url">
            Live demo URL{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="demo-url"
            type="url"
            placeholder="https://your-demo.vercel.app"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            A working deployment so buyers can try it before paying.
          </p>
        </div>

        {/* Preview screenshots */}
        <div className="flex flex-col gap-2">
          <Label>
            Preview screenshots{" "}
            <span className="font-normal text-muted-foreground">(up to {MAX_PREVIEWS})</span>
          </Label>
          {previewImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewImages.map((url) => (
                <div key={url} className="group relative aspect-video overflow-hidden border-2 border-border bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPreviewImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center border border-border bg-background/80 font-pixel text-[10px] text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove screenshot"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {previewImages.length < MAX_PREVIEWS && (
            <label className="flex cursor-pointer items-center justify-center border-2 border-dashed border-border bg-background px-4 py-6 text-center font-mono text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePreviewUpload}
                disabled={isSubmitting || previewUploading}
              />
              {previewUploading ? "Uploading…" : "+ Add screenshots"}
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Show the UI or output so buyers see exactly what they&apos;re getting.
          </p>
        </div>

        {/* Detected AI tools (from the archive) */}
        {aiSignals.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Detected AI tools</Label>
            <div className="flex flex-wrap gap-2">
              {aiSignals.map((s) => (
                <span key={s} className="border-2 border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[10px] text-primary">{s}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Found in your archive — shown as a badge on the listing.
            </p>
          </div>
        )}

        {/* Security scan (heuristic) */}
        {file && (scanning || securityFlags.length > 0) && (
          <div className="flex flex-col gap-2">
            <Label>Security scan</Label>
            {scanning ? (
              <p className="font-mono text-xs text-muted-foreground">Scanning archive…</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {securityFlags.map((id) => {
                    const rule = SECURITY_CATALOG[id];
                    if (!rule) return null;
                    return (
                      <div key={id} className={"border-2 px-3 py-2 " + SEVERITY_STYLE[rule.severity]}>
                        <p className="font-pixel text-[9px] uppercase tracking-wider">{rule.severity} · {rule.label}</p>
                        <p className="mt-1 font-mono text-[10px] leading-relaxed opacity-90">{rule.description}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Heuristic flags — not a virus scan and not proof of anything. They&apos;re shown to buyers; if a flag is expected (e.g. a CLI that runs commands), that&apos;s fine.
                </p>
              </>
            )}
          </div>
        )}
        {file && !scanning && securityFlags.length === 0 && fileManifest.length > 0 && (
          <p className="font-mono text-xs text-green-400">✓ Security scan: no suspicious patterns flagged.</p>
        )}

        {/* Dependency vulnerabilities (OSV.dev) */}
        {file && (scanningVuln || vulnFindings.length > 0) && (
          <div className="flex flex-col gap-2">
            <Label>Dependency vulnerabilities</Label>
            {scanningVuln ? (
              <p className="font-mono text-xs text-muted-foreground">Checking dependencies against OSV.dev…</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  {vulnFindings.map((v) => (
                    <div key={v} className="border-2 border-amber-400/50 bg-amber-400/10 px-3 py-1.5 font-mono text-[10px] text-amber-400"><VulnFinding text={v} /></div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Known advisories in your dependencies (source: OSV.dev). Update the affected packages if possible.
                </p>
              </>
            )}
          </div>
        )}

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

        {/* Built with AI */}
        <div className="flex flex-col gap-2">
          <Label>
            Built with AI{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Disclose which AI tools you used. Shown as a badge on your listing.
          </p>

          {/* Preset toggles */}
          <div className="flex flex-wrap gap-2">
            {AI_PRESETS.map((tool) => {
              const active = aiTools.includes(tool);
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleAiTool(tool)}
                  disabled={isSubmitting}
                  className={cn(
                    "border-2 px-3 py-1.5 font-mono text-xs transition-colors outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
                  )}
                >
                  {tool}
                </button>
              );
            })}
          </div>

          {/* Custom (non-preset) tools as removable chips */}
          {aiTools.some((t) => !AI_PRESETS.includes(t)) && (
            <div className="flex flex-wrap gap-1.5">
              {aiTools
                .filter((t) => !AI_PRESETS.includes(t))
                .map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeAiTool(tool)}
                      disabled={isSubmitting}
                      className="opacity-60 transition-opacity hover:opacity-100"
                      aria-label={`Remove ${tool}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}

          {/* Add a custom tool */}
          {aiTools.length < MAX_AI_TOOLS && (
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addAiTool(aiInput);
                }
              }}
              onBlur={() => { if (aiInput) addAiTool(aiInput); }}
              placeholder="Other tool — type and press Enter"
              disabled={isSubmitting}
              className="border-2 border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          )}
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
          <Label>
            {isEdit ? "Upload new version" : "ZIP archive"}{" "}
            {isEdit && (
              <span className="font-normal text-muted-foreground">
                (optional — leave empty to keep the current version)
              </span>
            )}
          </Label>

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

        {/* Changelog — only relevant when a ZIP is attached (a new version) */}
        {file && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="changelog">
              {isEdit ? "What changed in this version?" : "Release notes"}{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="changelog"
              rows={2}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder={isEdit ? "Fixed X, added Y…" : "Initial release notes…"}
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>
        )}
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
              ? "Saving…"
              : isEdit && file
                ? "Publish version"
                : isEdit
                  ? "Publish"
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
