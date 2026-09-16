import { useEffect, useState, useMemo } from 'react'
import { stockAvatarFor } from '../../stockImages'
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
  stockFallback = true,
}) {
  const [imgError, setImgError] = useState(false)

  const resolvedUsername = username || user?.username || ''
  const resolvedSrc = src || avatarUrl || user?.avatar_url || null
  const stockSrc = useMemo(() => stockAvatarFor(resolvedUsername), [resolvedUsername])
  const fallbackSrc = stockFallback ? stockSrc : null
  const imgSrc = resolvedSrc || fallbackSrc
  const initial = (resolvedUsername || '?')[0].toUpperCase()
  const px = SIZE_MAP[size] || SIZE_MAP.md
  const fontSize = FONT_SIZE_MAP[size] || FONT_SIZE_MAP.md

  // Якщо src змінився (напр. завантажили новий аватар) — даємо картинці ще шанс.
  useEffect(() => {
    setImgError(false)
  }, [resolvedSrc, stockSrc])

  const showImage = imgSrc && !imgError

  return (
    <div
      className={`${styles.avatar} ${className}`}
      style={{ width: px, height: px }}
      aria-label={`Avatar ${resolvedUsername}`}
    >
      {showImage ? (
        <img
          src={imgSrc}
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
