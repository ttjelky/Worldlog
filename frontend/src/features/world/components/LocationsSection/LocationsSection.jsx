import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../../../api'
import sharedStyles from '../shared/section.module.css'
import ExpandableCard, { useExpandableCard } from '../shared/ExpandableCard'
import RelationshipList from '../shared/RelationshipList'
import { useUndo } from '../../../../shared/undo/UndoProvider'
import LocationRichTextEditor from '../shared/LocationRichTextEditor'
import styles from './LocationsSection.module.css'

const categories = [
  ['farm', 'Ферма'],
  ['mine', 'Шахта'],
  ['town', 'Містечко'],
  ['base', 'База'],
  ['structure', 'Структура'],
  ['biome', 'Біом'],
  ['build', 'Споруда'],
  ['poi', 'Точка інтересу'],
  ['other', 'Інше'],
]
const categoryLabels = Object.fromEntries(categories)
const legacyCategoryLabels = {
  village: categoryLabels.town,
  temple: categoryLabels.build,
}
const empty = { name: '', description: '', x: 0, y: 0, z: 0, category: 'other' }
const COORD_KEYS = ['x', 'y', 'z']
const CAROUSEL_PER_PAGE = 2
const CAROUSEL_INTERVAL = 10000

function LocationDetails({
  worldId,
  location,
  accent,
  uploading,
  onClose,
  onEdit,
  onDelete,
  onUpload,
  onDeleteShot,
  canEdit,
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const shots = location.screenshots || []
  const activeShot = shots[0] || null
  const category =
    legacyCategoryLabels[location.category] ||
    categoryLabels[location.category] ||
    categoryLabels.other

  const handleUpload = async (file) => {
    if (!file || isUploading) return
    setIsUploading(true)
    try {
      await onUpload(file)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <div className={styles.detailsHead}>
        <h3 className={styles.detailsName}>{location.name}</h3>
        <div className={styles.detailsMeta}>
          <span className={`${styles.catPill} ${styles.detailsPill}`}>{category}</span>
          <span className={styles.detailsCoords}>
            {location.x} {location.y} {location.z}
          </span>
        </div>
      </div>

      {activeShot ? (
        <img className={styles.detailsMainImg} src={activeShot.image} alt={location.name} />
      ) : (
        <div className={styles.detailsPlaceholder}>
          <PhotoCameraOutlinedIcon />
          <span>Ще немає фото</span>
        </div>
      )}

      {location.description && <p className={styles.detailsDesc}>{location.description}</p>}

      <RelationshipList worldId={worldId} sourceType="location" sourceId={location.id} />

      <div className={styles.detailsFooter}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
        {activeShot ? (
          <>
            <Button
              variant="contained"
              size="small"
              disabled={isUploading || uploading}
              startIcon={<AddPhotoAlternateOutlinedIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading || uploading ? 'Завантаження…' : 'Замінити фото'}
            </Button>
            <IconButton
              className={styles.actionBtn}
              aria-label="Видалити фото"
              disabled={isUploading || uploading}
              onClick={() => onDeleteShot(activeShot)}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Button
            variant="contained"
            size="small"
            disabled={isUploading || uploading}
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading || uploading ? 'Завантаження…' : 'Додати фото'}
          </Button>
        )}
        <div className={styles.locSpacer} />
        {canEdit && (
          <>
            <IconButton className={styles.actionBtn} aria-label="Редагувати локацію" onClick={onEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton className={styles.actionBtn} aria-label="Видалити локацію" onClick={onDelete}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </div>
    </div>
  )
}

const cleanName = (value) => value.replace(/\s*\n+\s*/g, ' ').trim()

const nameTextStyle = {
  fontSize: 'clamp(24px, 4vw, 36px)',
  fontWeight: 500,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#ffffff',
}

const descTextStyle = {
  fontSize: '15px',
  lineHeight: 1.55,
  color: 'rgba(255, 255, 255, 0.85)',
}

// Inline-редактор нової локації в дусі нотаток/гравців: назва, категорія,
// координати, опис і фото пишуться прямо в модалці чернетки.
function LocationEditor({
  worldId,
  accent,
  form,
  setForm,
  saving,
  pendingPhoto,
  onPickPhoto,
  onClearPhoto,
  onSave,
  onCancel,
}) {
  const fileRef = useRef(null)
  const coordRefs = useRef({})
  const canSave = cleanName(form.name).length > 0 && !saving
  const submit = (e) => {
    e.preventDefault()
    if (canSave) onSave()
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canSave) onSave()
    }
  }
  const clearZero = (c) => {
    if (form[c] === 0 || form[c] === '0') setForm((f) => ({ ...f, [c]: '' }))
  }
  const coordKey = (e, i) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (i < COORD_KEYS.length - 1) coordRefs.current[COORD_KEYS[i + 1]]?.focus()
    else if (canSave) onSave()
  }

  return (
    <div className={`${sharedStyles.card} ${styles.details}`} style={{ '--accent': accent }}>
      <form onSubmit={submit} onKeyDown={onKeyDown} className={styles.editorForm}>
        <div className={styles.detailsHead}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Назва локації"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
            placeholder="Назва"
            editableStyle={nameTextStyle}
          />
        </div>

        <div className={styles.catPickRow} role="group" aria-label="Категорія">
          {categories.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={form.category === v}
              className={`${styles.catChip} ${form.category === v ? styles.catChipActive : ''}`}
              onClick={() => setForm((f) => ({ ...f, category: v }))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.editorCoords}>
          {COORD_KEYS.map((c, i) => (
            <label key={c} className={styles.coordBox}>
              <span className={styles.coordLabel}>{c.toUpperCase()}</span>
              <input
                ref={(el) => {
                  coordRefs.current[c] = el
                }}
                type="number"
                className={styles.coordInput}
                value={form[c]}
                onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
                onFocus={() => clearZero(c)}
                onKeyDown={(e) => coordKey(e, i)}
                aria-label={`Координата ${c.toUpperCase()}`}
              />
            </label>
          ))}
        </div>

        <div className={styles.editorBody}>
          <LocationRichTextEditor
            bare
            dark
            worldId={worldId}
            label="Опис локації"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            multiline
            minRows={3}
            placeholder="Опис…"
            editableStyle={descTextStyle}
          />
        </div>

        <div className={styles.photoRow}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            aria-label="Обрати фото"
            onChange={onPickPhoto}
          />
          {pendingPhoto ? (
            <div className={styles.attachPreviews}>
              <div className={styles.attachPreview}>
                <img src={pendingPhoto.url} alt="" />
                <IconButton
                  size="small"
                  className={styles.attachRemove}
                  aria-label="Прибрати фото"
                  onClick={onClearPhoto}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => fileRef.current?.click()}
            >
              <AddPhotoAlternateOutlinedIcon fontSize="small" />
              Додати фото
            </button>
          )}
        </div>

        <div className={styles.editorFooter}>
          <span className={styles.editorHint}>Ctrl + Enter — створити</span>
          <span className={styles.editorActions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Скасувати
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!canSave}>
              {saving ? 'Створення…' : 'Створити'}
            </button>
          </span>
        </div>
      </form>
    </div>
  )
}

// Відкриває власну модалку одразу після монтування —
// чернетка нової локації масштабується з місця у списку.
function AutoOpen() {
  const { open } = useExpandableCard()
  useEffect(() => {
    open()
  }, [open])
  return null
}

function NewLocationCard({
  worldId,
  accent,
  form,
  setForm,
  saving,
  pendingPhoto,
  onPickPhoto,
  onClearPhoto,
  onSave,
  onDiscard,
}) {
  const draftName = cleanName(form.name)

  return (
    <ExpandableCard
      showExpandBtn={false}
      onClose={onDiscard}
      expandedContent={({ close }) => (
        <LocationEditor
          worldId={worldId}
          accent={accent}
          form={form}
          setForm={setForm}
          saving={saving}
          pendingPhoto={pendingPhoto}
          onPickPhoto={onPickPhoto}
          onClearPhoto={onClearPhoto}
          onSave={() => onSave(close)}
          onCancel={close}
        />
      )}
    >
      <AutoOpen />
      <article className={styles.locTile}>
        <div className={styles.locThumbArea}>
          {pendingPhoto ? (
            <img className={styles.locThumb} src={pendingPhoto.url} alt="" />
          ) : (
            <div className={styles.locThumbPlaceholder}>
              <PhotoCameraOutlinedIcon />
            </div>
          )}
        </div>
        <div className={styles.locBody}>
          <div className={`${styles.locName} ${draftName ? '' : styles.draftName}`}>
            {draftName || 'Нова локація…'}
          </div>
        </div>
      </article>
    </ExpandableCard>
  )
}

export default function LocationsSection({ worldId, accent, userRole }) {
  const qc = useQueryClient()
  const section = useExpandableCard()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [pos, setPos] = useState(1)
  const [instant, setInstant] = useState(false)
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState(null)
  const snapTimer = useRef(null)
  const pendingTarget = useRef(null)
  const attachInputRef = useRef(null)
  const coordInputs = useRef({})
  const formRef = useRef(null)
  const canEdit = userRole && userRole !== 'viewer'

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', String(worldId)],
    queryFn: () => api.get(`/worlds/${worldId}/locations/`).then((r) => r.data),
  })
  // Мінімізована картка з понад 2 локаціями — карусель по 2 на слайд
  const isCarousel = !section.modal && locations.length > CAROUSEL_PER_PAGE
  const pageCount = Math.max(1, Math.ceil(locations.length / CAROUSEL_PER_PAGE))
  const modalLocations = locations.filter((l) => {
    if (catFilter && l.category !== catFilter) return false
    const q = search.trim().toLowerCase()
    if (section.full && q) {
      return `${l.name || ''} ${l.description || ''}`.toLowerCase().includes(q)
    }
    return true
  })
  const visibleLocations = section.modal
    ? modalLocations
    : locations.slice(0, CAROUSEL_PER_PAGE)
  // Справжня сторінка (0..pageCount-1) для крапок-індикаторів
  const realPage = ((pos - 1) % pageCount + pageCount) % pageCount

  // Трек: [клон останньої, ...chunks, клон першої], pos=1 => перша сторінка.
  // Клони з обох боків дають безшовний рух у будь-який бік, а повернення
  // з клона на справжній слайд відбувається тихо (вміст ідентичний).
  const cloneCounterpart = (p) => {
    if (p === 0) return pageCount
    if (p === pageCount + 1) return 1
    return null
  }
  // Трек-позицію в справжню (1..pageCount)
  const toRealPos = (p) => ((p - 1) % pageCount + pageCount) % pageCount + 1

  const cancelSnap = () => {
    if (snapTimer.current) {
      clearTimeout(snapTimer.current)
      snapTimer.current = null
    }
  }

  const step = (d) => {
    cancelSnap()
    const c = cloneCounterpart(pos)
    if (c !== null) {
      // Клік під час стоянки на клоні (рідкісне вікно ~0.5с) — тихо,
      // зате одразу в цільову справжню позицію
      setInstant(true)
      setPos(toRealPos(c + d))
      return
    }
    if (instant) {
      // Transition щойно вимкнено — рух поїде наступним кадром,
      // інакше браузер склеїть зміну transition і transform в один рендер
      // та анімація не запуститься
      pendingTarget.current = pos + d
      return
    }
    setPos(pos + d)
  }

  const jump = (i) => {
    cancelSnap()
    if (cloneCounterpart(pos) !== null) {
      setInstant(true)
      setPos(i + 1)
      return
    }
    if (i + 1 === pos && !instant) return
    if (instant) {
      pendingTarget.current = i + 1
      return
    }
    setPos(i + 1)
  }

  useEffect(() => {
    setPos((p) => Math.min(Math.max(p, 1), pageCount))
  }, [pageCount])

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
    },
    [],
  )

  // Доїхали до клона — непомітно повертаємось на справжній слайд
  useEffect(() => {
    if (pos !== 0 && pos !== pageCount + 1) return
    snapTimer.current = setTimeout(() => {
      snapTimer.current = null
      setInstant(true)
      setPos(cloneCounterpart(pos))
    }, 300)
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
  }, [pos, pageCount])

  // Після телепорту вмикаємо transition окремим кадром, без зміни transform —
  // інакше наступний рух склеїться в один рендер і анімація не запуститься
  useEffect(() => {
    if (!instant) return
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [instant])

  // Відкладений рух (клік у той самий кадр, що й телепорт) — їде після
  // переозброєння transition, тому анімація завжди програється
  useEffect(() => {
    if (instant || pendingTarget.current === null) return
    const t = pendingTarget.current
    pendingTarget.current = null
    setPos(t)
  }, [instant, pos])

  // Автогортання каруселі: пауза при наведенні, прихованій вкладці та reduced motion
  useEffect(() => {
    if (!isCarousel || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      if (document.hidden) return
      step(1)
    }, CAROUSEL_INTERVAL)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCarousel, paused, pos, pageCount])

  const chunks = useMemo(() => {
    const out = []
    for (let i = 0; i < locations.length; i += CAROUSEL_PER_PAGE) {
      out.push(locations.slice(i, i + CAROUSEL_PER_PAGE))
    }
    return out
  }, [locations])

  const renderTile = (l) => (
    <ExpandableCard
      key={l.id}
      clickOpens
      showExpandBtn={false}
      className={styles.locTileWrap}
      expandedContent={({ close }) => (
        <LocationDetails
          worldId={worldId}
          location={l}
          accent={accent}
          uploading={uploadPhotos.isPending}
          onClose={close}
          onEdit={() => openEdit(l)}
          onDelete={() => {
            deleteLocation(l)
            close()
          }}
          onUpload={(file) => uploadPhotos.mutateAsync({ locationId: l.id, files: [file] })}
          onDeleteShot={(shot) => deleteScreenshot.mutate({ location: l, shot })}
          canEdit={canEdit}
        />
      )}
    >
      <article className={styles.locTile}>
              <div className={styles.locThumbArea}>
                {l.screenshots?.[0] ? (
                  <img className={styles.locThumb} src={l.screenshots[0].image} alt={l.name} loading="lazy" decoding="async" />
                ) : (
            <div className={styles.locThumbPlaceholder}>
              <PhotoCameraOutlinedIcon />
            </div>
          )}
        </div>
        <div className={styles.locBody}>
          <div className={styles.locTopRow}>
            <div className={styles.locName}>{l.name}</div>
            <span className={styles.catPill}>
              {legacyCategoryLabels[l.category] ||
                categoryLabels[l.category] ||
                categoryLabels.other}
            </span>
          </div>
          <div className={styles.coords}>
            {l.x} {l.y} {l.z}
          </div>
          {l.description && <div className={styles.desc}>{l.description}</div>}
        </div>
        <footer className={styles.locFooter}>
          {canEdit && (
            <>
              <IconButton
                className={styles.actionBtn}
                aria-label="Редагувати локацію"
                onClick={(e) => {
                  e.stopPropagation()
                  openEdit(l)
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                className={styles.actionBtn}
                aria-label="Видалити локацію"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteLocation(l)
                }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </footer>
      </article>
    </ExpandableCard>
  )
  const mutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.patch(`/worlds/${worldId}/locations/${editing.id}/`, payload)
        : api.post(`/worlds/${worldId}/locations/`, payload),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })
  const undo = useUndo()
  const deleteLocation = (l) =>
    undo.deleteItem({
      id: l.id,
      url: `/worlds/${worldId}/locations/${l.id}/`,
      queryKeys: [
        ['locations', String(worldId)],
        ['world', String(worldId)],
      ],
      message: `Локацію «${l.name}» видалено`,
      nouns: ['локація', 'локації', 'локацій'],
    })
  const uploadPhotos = useMutation({
    mutationFn: ({ locationId, files }) =>
      Promise.all(
        Array.from(files).map((file) =>
          api.post(
            `/worlds/${worldId}/locations/${locationId}/screenshots/`,
            { image: file },
            { headers: { 'Content-Type': 'multipart/form-data' } },
          ),
        ),
      ),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })
  const deleteScreenshot = useMutation({
    mutationFn: ({ location, shot }) =>
      api.delete(`/worlds/${worldId}/locations/${location.id}/screenshots/${shot.id}/`),
    onSuccess: () => qc.invalidateQueries(['locations', String(worldId)]),
  })

  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url)
    }
  }, [pendingPhoto])

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setPendingPhoto(null)
    setCreating(true)
  }
  const discardCreate = () => {
    setCreating(false)
    setForm(empty)
    setPendingPhoto(null)
  }
  const saveCreate = async (close) => {
    const name = cleanName(form.name)
    if (!name || mutation.isPending || uploadPhotos.isPending) return
    try {
      const res = await mutation.mutateAsync({
        name,
        description: form.description || '',
        category: form.category,
        x: Number(form.x) || 0,
        y: Number(form.y) || 0,
        z: Number(form.z) || 0,
      })
      if (pendingPhoto) {
        await uploadPhotos.mutateAsync({ locationId: res.data.id, files: [pendingPhoto.file] })
      }
      discardCreate()
      close()
    } catch {}
  }
  const openEdit = (l) => {
    setEditing(l)
    setForm({ ...l })
    setPendingPhoto(null)
    setOpen(true)
  }
  const addPendingPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file, url: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }
  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await mutation.mutateAsync({
        ...form,
        x: Number(form.x),
        y: Number(form.y),
        z: Number(form.z),
      })
      const locationId = editing ? editing.id : res.data.id
      if (pendingPhoto) {
        await uploadPhotos.mutateAsync({ locationId, files: [pendingPhoto.file] })
      }
      setEditing(null)
      setPendingPhoto(null)
      setOpen(false)
    } catch {}
  }

  return (
    <div
      className={`${sharedStyles.card} ${isCarousel ? styles.cardCarousel : ''}`}
      style={{ '--accent': accent }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={sharedStyles.sectionHeader}>
        <h3 className={sharedStyles.sectionTitle}>Локації ({locations.length})</h3>
        <div className={styles.headerActions}>
          {isCarousel && (
            <div className={styles.carouselNav}>
              <button
                type="button"
                className={styles.carouselArrow}
                aria-label="Попередні локації"
                onClick={() => step(-1)}
              >
                <ChevronLeftIcon fontSize="small" />
              </button>
              <button
                type="button"
                className={styles.carouselArrow}
                aria-label="Наступні локації"
                onClick={() => step(1)}
              >
                <ChevronRightIcon fontSize="small" />
              </button>
            </div>
          )}
        {canEdit && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openNew}
          >
            Нова локація
          </Button>
        )}
        </div>
      </div>

      {section.full && (
        <>
          <div className={sharedStyles.searchWrap}>
            <SearchIcon className={sharedStyles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={sharedStyles.wideSearch}
              placeholder="Знайти локацію…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук локації"
            />
          </div>
          <div className={styles.catChips} role="group" aria-label="Фільтр за категорією">
            {categories.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={catFilter === value}
                className={`${styles.catChip} ${catFilter === value ? styles.catChipActive : ''}`}
                onClick={() => setCatFilter(catFilter === value ? null : value)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        className={`${sharedStyles.body} ${
          isCarousel
            ? styles.carouselBody
            : `${styles.locGrid} ${styles.gridFull} ${section.full ? styles.locGridWide : ''}`
        }`}
      >
        {canEdit && creating && (
          <NewLocationCard
            worldId={worldId}
            accent={accent}
            form={form}
            setForm={setForm}
            saving={mutation.isPending || uploadPhotos.isPending}
            pendingPhoto={pendingPhoto}
            onPickPhoto={addPendingPhoto}
            onClearPhoto={() => setPendingPhoto(null)}
            onSave={saveCreate}
            onDiscard={discardCreate}
          />
        )}
        {isCarousel ? (
          <div className={styles.carouselViewport}>
            <div
              className={styles.carouselTrack}
              style={{
                transform: `translateX(-${pos * 100}%)`,
                transition: instant ? 'none' : undefined,
              }}
            >
              {[chunks[pageCount - 1], ...chunks, chunks[0]].map((chunk, i) => (
                <div
                  key={i}
                  className={`${styles.locGrid} ${styles.carouselSlide}`}
                  aria-hidden={i !== pos}
                  inert={i !== pos}
                >
                  {chunk.map((l) => renderTile(l))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {visibleLocations.map((l) => renderTile(l))}
            {visibleLocations.length === 0 && (
              <p className={sharedStyles.emptyMsg}>
                {locations.length === 0
                  ? 'Світ ще не досліджений. Додай першу локацію.'
                  : 'Нічого не знайдено.'}
              </p>
            )}
          </>
        )}
      </div>
      {isCarousel && (
        <div className={styles.carouselDots}>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.carouselDot} ${
                i === realPage ? styles.carouselDotActive : ''
              }`}
              aria-label={`Сторінка ${i + 1} з ${pageCount}`}
              onClick={() => jump(i)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { className: sharedStyles.dialogPaper, style: { '--accent': accent } },
        }}
      >
        <form onSubmit={submit} ref={formRef}>
          <DialogTitle>Редагувати локацію</DialogTitle>
          <DialogContent>
            <div className={sharedStyles.formFields}>
              <div className={styles.titleRow}>
                <TextField
                  label="Назва"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                  className={styles.titleField}
                />
                <input
                  ref={attachInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={addPendingPhoto}
                />
                <Button
                  size="small"
                  startIcon={<AddPhotoAlternateOutlinedIcon />}
                  onClick={() => attachInputRef.current?.click()}
                  title={pendingPhoto ? 'Замінити фото' : 'Додати фото'}
                >
                  {pendingPhoto ? 'Замінити фото' : 'Додати фото'}
                </Button>
              </div>
              <TextField
                label="Опис"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                multiline
                minRows={2}
              />
              <div className={styles.coordRow}>
                {COORD_KEYS.map((c, i) => (
                  <TextField
                    key={c}
                    label={c.toUpperCase()}
                    type="number"
                    value={form[c]}
                    onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
                    className={styles.coordField}
                    inputRef={(el) => {
                      coordInputs.current[c] = el
                    }}
                    onFocus={() => {
                      // Дефолтні нулі стираються одразу — можна друкувати поверх
                      if (form[c] === 0 || form[c] === '0') {
                        setForm((f) => ({ ...f, [c]: '' }))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      if (i < COORD_KEYS.length - 1) coordInputs.current[COORD_KEYS[i + 1]]?.focus()
                      else formRef.current?.requestSubmit()
                    }}
                  />
                ))}
              </div>
              <TextField
                label="Категорія"
                select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {categories.map(([v, label]) => (
                  <MenuItem key={v} value={v}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              {pendingPhoto && (
                <div className={styles.attachPreviews}>
                  <div className={styles.attachPreview}>
                    <img src={pendingPhoto.url} alt="" />
                    <IconButton
                      size="small"
                      className={styles.attachRemove}
                      aria-label="Прибрати фото"
                      onClick={() => setPendingPhoto(null)}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions className={sharedStyles.dialogActions}>
            <Button onClick={() => setOpen(false)} className={sharedStyles.dialogBtnCancel}>
              Скасувати
            </Button>
            <Button type="submit" className={sharedStyles.dialogBtnSubmit}>
              Зберегти
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
