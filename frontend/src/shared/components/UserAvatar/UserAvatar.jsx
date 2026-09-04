import { useState, useMemo } from 'react'
import styles from './UserAvatar.module.css'

const SIZE_MAP = {
  xs: 28,
  sm: 40,
  md: 52,
  lg: 80,
  xl: 120,
}

const FONT_SIZE_MAP = {
  xs: 11,
  sm: 15,
  md: 20,
  lg: 32,
  xl: 48,
}

export default function UserAvatar({
  user,
  src,
  avatarUrl,
  username,
  displayName,
  size = 'md',
  className = '',
}) {
  const [imgError, setImgError] = useState(false)

  const resolvedUsername = username || user?.username || ''
  const resolvedSrc = src || avatarUrl || user?.avatar_url || null
  const initial = (resolvedUsername || '?')[0].toUpperCase()
  const px = SIZE_MAP[size] || SIZE_MAP.md
  const fontSize = FONT_SIZE_MAP[size] || FONT_SIZE_MAP.md

  const showImage = resolvedSrc && !imgError

  return (
    <div
      className={`${styles.avatar} ${className}`}
      style={{ width: px, height: px }}
      aria-label={`Avatar ${resolvedUsername}`}
    >
      {showImage ? (
        <img
          src={resolvedSrc}
          alt={resolvedUsername}
          className={styles.img}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span className={styles.initial} style={{ fontSize }}>
          {initial}
        </span>
      )}
    </div>
  )
}
