'use client'

import { useMemo, useRef, useState } from 'react'
import { Folder, FolderOpen, FileCode, Lock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TreeNode {
  name: string
  path: string
  isFile: boolean
  children: Map<string, TreeNode>
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFile: false, children: new Map() }
  for (const full of paths) {
    const parts = full.split('/').filter(Boolean)
    let node = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path, isFile, children: new Map() })
      }
      node = node.children.get(part)!
    })
  }
  return root
}

const TEXT_EXT = /\.(txt|md|markdown|json|jsonc|js|jsx|ts|tsx|mjs|cjs|css|scss|sass|less|html|htm|xml|svg|yml|yaml|toml|ini|env|sh|bash|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|sql|graphql|gql|vue|svelte|astro|prisma|gitignore|dockerfile|lock|conf|cfg|csv)$/i

export function RepoFiles({
  manifest,
  storagePath,
  canView,
  lockedLabel,
}: {
  manifest: string[]
  storagePath: string | null
  canView: boolean
  lockedLabel: string
}) {
  const tree = useMemo(() => buildTree(manifest), [manifest])
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // expand the top level by default
    const s = new Set<string>()
    for (const [, child] of buildTree(manifest).children) if (!child.isFile) s.add(child.path)
    return s
  })
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  // Minimal shape of what we use from a loaded JSZip instance.
  type ZipLike = { file(path: string): { async(t: 'string'): Promise<string> } | null }
  // Cache the unzipped archive so we only download it once.
  const zipRef = useRef<ZipLike | null>(null)

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function openFileContent(path: string) {
    if (!canView || !storagePath) return
    setOpenFile(path)
    setContent(null)
    setFileError(null)

    if (!TEXT_EXT.test(path)) {
      setFileError('Preview not available for this file type. Download to open it.')
      return
    }

    setLoadingFile(true)
    try {
      if (!zipRef.current) {
        const supabase = createClient()
        const { data, error } = await supabase.storage.from('repositories').createSignedUrl(storagePath, 120)
        if (error || !data) throw new Error(error?.message ?? 'Could not access the archive')
        const res = await fetch(data.signedUrl)
        const buf = await res.arrayBuffer()
        const JSZip = (await import('jszip')).default
        zipRef.current = (await JSZip.loadAsync(buf)) as unknown as ZipLike
      }
      const entry = zipRef.current.file(path)
      if (!entry) { setFileError('File not found in the archive.'); setLoadingFile(false); return }
      const text: string = await entry.async('string')
      setContent(text.length > 200_000 ? text.slice(0, 200_000) + '\n\n… (truncated)' : text)
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Could not load this file.')
    }
    setLoadingFile(false)
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const entries = [...node.children.values()].sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    return entries.map((child) => {
      const pad = { paddingLeft: `${depth * 14 + 12}px` }
      if (child.isFile) {
        return (
          <button
            key={child.path}
            type="button"
            onClick={() => openFileContent(child.path)}
            style={pad}
            className={
              'flex w-full items-center gap-2 py-1.5 pr-3 text-left font-mono text-xs transition-colors ' +
              (openFile === child.path ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground') +
              (canView ? '' : ' cursor-default')
            }
          >
            {canView ? <FileCode className="h-3.5 w-3.5 shrink-0 opacity-70" /> : <Lock className="h-3 w-3 shrink-0 opacity-60" />}
            <span className="truncate">{child.name}</span>
          </button>
        )
      }
      const isOpen = expanded.has(child.path)
      return (
        <div key={child.path}>
          <button type="button" onClick={() => toggle(child.path)} style={pad}
            className="flex w-full items-center gap-2 py-1.5 pr-3 text-left font-mono text-xs text-foreground transition-colors hover:bg-secondary">
            {isOpen ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />}
            <span className="truncate">{child.name}</span>
          </button>
          {isOpen && renderNode(child, depth + 1)}
        </div>
      )
    })
  }

  if (manifest.length === 0) return null

  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 font-pixel text-[10px] uppercase tracking-wider">
        Files
        <span className="font-mono text-muted-foreground">({manifest.length})</span>
        {!canView && (
          <span className="ml-2 inline-flex items-center gap-1 border border-border px-2 py-0.5 font-mono text-[9px] normal-case text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />{lockedLabel}
          </span>
        )}
      </h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        {/* Tree */}
        <div className="max-h-[420px] overflow-auto border-2 border-border bg-card py-2">
          {renderNode(tree, 0)}
        </div>

        {/* Viewer */}
        <div className="min-h-[200px] border-2 border-border bg-card">
          {!openFile ? (
            <p className="grid h-full place-items-center p-6 text-center font-mono text-xs text-muted-foreground">
              {canView ? 'Select a file to preview its contents.' : lockedLabel}
            </p>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-2 border-b-2 border-border px-3 py-2">
                <span className="truncate font-mono text-[11px] text-foreground">{openFile}</span>
                <button onClick={() => { setOpenFile(null); setContent(null); setFileError(null) }} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[380px] overflow-auto p-3">
                {loadingFile ? (
                  <p className="font-mono text-xs text-muted-foreground">Loading<span className="blink">_</span></p>
                ) : fileError ? (
                  <p className="font-mono text-xs text-muted-foreground">{fileError}</p>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">{content}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
