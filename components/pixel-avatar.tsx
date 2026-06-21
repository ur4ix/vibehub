// Deterministic, well-spread avatar background colour per user id.
// Same pixel style (initials), but every account gets its own hue across the
// full spectrum. Fixed lightness/chroma keep the dark initials readable.
export function colorFromId(id: string) {
  // FNV-1a hash → far better spread than a char-sum (avoids look-alikes).
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const hue = Math.abs(h) % 360
  return `oklch(0.74 0.15 ${hue})`
}

interface PixelAvatarProps {
  username: string
  avatarColor: string
  size?: number
  className?: string
  imageUrl?: string | null
}

export function PixelAvatar({ username, avatarColor, size = 32, className, imageUrl }: PixelAvatarProps) {
  const initials = username.slice(0, 2).toUpperCase()

  if (imageUrl) {
    return (
      // Avatar URLs are arbitrary (uploads or OAuth providers) and tiny, so
      // next/image (domain allow-list) isn't worth the breakage risk here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={username}
        className={'border-2 border-border object-cover ' + (className ?? '')}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={'grid place-items-center border-2 border-border font-pixel uppercase text-primary-foreground ' + (className ?? '')}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor,
        fontSize: Math.max(8, Math.round(size * 0.3)),
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
