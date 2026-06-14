const AVATAR_COLORS = [
  'oklch(0.78 0.18 65)',
  'oklch(0.7 0.15 200)',
  'oklch(0.75 0.16 90)',
  'oklch(0.78 0.15 75)',
]

export function colorFromId(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
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
