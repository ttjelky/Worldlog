import { createContext, useContext, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import CloseIcon from '@mui/icons-material/Close'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { categoryLabel } from './locationData'
import sharedStyles from './section.module.css'
import styles from './LocationViewer.module.css'

const LocationViewerContext = createContext({ openLocation: () => {} })

export function useLocationViewer() {
  return useContext(LocationViewerContext)
}

export default function LocationViewerProvider({ accent = '#A63C39', children }) {
  const [location, setLocation] = useState(null)

  const openLocation = useCallback((loc) => setLocation(loc), [])
  const close = useCallback(() => setLocation(null), [])

  return (
    <LocationViewerContext.Provider value={{ openLocation }}>
      {children}
      {location &&
        createPortal(
          <div
            className={styles.backdrop}
            onClick={(e) => e.target === e.currentTarget && close()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`${sharedStyles.card} ${styles.modal}`} style={{ '--accent': accent }}>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрити локацію"
                onClick={close}
              >
                <CloseIcon />
              </button>

              <div className={styles.head}>
                <span className={styles.kicker}>
                  <LocationOnIcon fontSize="small" />
                  Локація
                </span>
                <h3 className={styles.name}>{location.name}</h3>
                <div className={styles.meta}>
                  <span className={styles.catPill}>{categoryLabel(location.category)}</span>
                  <span className={styles.coords}>
                    {location.x} {location.y} {location.z}
                  </span>
                </div>
              </div>

              {location.screenshots?.[0] ? (
                <img
                  className={styles.mainImg}
                  src={location.screenshots[0].image}
                  alt={location.name}
                />
              ) : (
                <div className={styles.placeholder}>
                  <PhotoCameraOutlinedIcon />
                  <span>Ще немає фото</span>
                </div>
              )}

              {location.description && (
                <p className={styles.desc}>
                  <PlaceOutlinedIcon fontSize="small" />
                  <span>{location.description}</span>
                </p>
              )}

              <div className={styles.footerNote}>
                <span>Координати:</span>
                <span className={styles.coordsBig}>
                  {location.x} / {location.y} / {location.z}
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </LocationViewerContext.Provider>
  )
}
