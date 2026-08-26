import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../api'
import UndoSnackbar from './UndoSnackbar'
import { UNDO_DELAY_MS } from './constants'

const UndoContext = createContext(null)

export function useUndo() {
  return useContext(UndoContext)
}

// Форми іменника за кількістю: plural(2, ['локація','локації','локацій']) → 'локації'
function plural(n, [one, few, many]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

// Текст тоста по всій черзі очікування:
// один елемент — детальне повідомлення, декілька — «x2 локації, x1 гравець видалено»
function buildToastText(entries) {
  if (entries.length === 0) return ''
  if (entries.length === 1) return entries[0].message
  const groups = new Map()
  entries.forEach((e) => {
    const key = e.nouns.join('\u0000')
    const group = groups.get(key) || { count: 0, nouns: e.nouns }
    group.count += 1
    groups.set(key, group)
  })
  const parts = [...groups.values()].map((g) => `x${g.count} ${plural(g.count, g.nouns)}`)
  return `${parts.join(', ')} видалено`
}

/**
 * Глобальний менеджер «видалення зі скасуванням».
 *
 * Живить НАД секціями й модалками (AppLayout), тому тост і таймер
 * переживають закриття розширеного вікна та навігацію між сторінками.
 *
 * deleteItem — прибирає елемент із кешу списку миттєво, а DELETE на
 * бекенд летить лише після UNDO_DELAY_MS; undo повертає дані з сервера.
 * deleteWorld — те саме для світа: undo повертає на його сторінку.
 */
export default function UndoProvider({ children }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [toast, setToast] = useState({ open: false, text: '', seq: 0 })
  const entriesRef = useRef([]) // { kind: 'item' | 'world', id, url, queryKeys }
  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const showToast = useCallback((entries) => {
    setToast((t) => ({ open: true, text: buildToastText(entries), seq: t.seq + 1 }))
  }, [])

  // Інвалідовуємо всі ключі записів без дублів
  const invalidateEntries = useCallback(
    (entries) => {
      const seen = new Set()
      entries.forEach((entry) =>
        entry.queryKeys.forEach((key) => {
          const serialized = JSON.stringify(key)
          if (!seen.has(serialized)) {
            seen.add(serialized)
            qc.invalidateQueries(key)
          }
        }),
      )
    },
    [qc],
  )

  // Підтвердити всі відкладені видалення (таймаут / клік повз / Escape)
  const confirm = useCallback(async () => {
    clearTimer()
    const entries = entriesRef.current
    entriesRef.current = []
    setToast((t) => ({ ...t, open: false }))
    if (entries.length === 0) return
    await Promise.allSettled(entries.map((e) => api.delete(e.url)))
    invalidateEntries(entries)
  }, [clearTimer, invalidateEntries])

  // Скасувати: нічого не видаляли — просто повертаємо дані з сервера,
  // а видалений світ знову відкриваємо на екрані
  const undo = useCallback(() => {
    clearTimer()
    const entries = entriesRef.current
    entriesRef.current = []
    setToast((t) => ({ ...t, open: false }))
    const worldEntry = entries.find((e) => e.kind === 'world')
    if (worldEntry) {
      navigate(`/app/worlds/${worldEntry.id}`)
      return
    }
    invalidateEntries(entries)
  }, [clearTimer, invalidateEntries, navigate])

  const deleteItem = useCallback(
    ({ id, url, queryKeys, message, nouns }) => {
      const mainKey = queryKeys[0]
      // cancelQueries не дає in-flight відповіді повернути елемент назад
      qc.cancelQueries({ queryKey: mainKey })
      qc.setQueryData(mainKey, (old) => (old ?? []).filter((x) => x.id !== id))
      entriesRef.current.push({ kind: 'item', id, url, queryKeys, message, nouns })
      showToast(entriesRef.current)
      clearTimer()
      timerRef.current = setTimeout(confirm, UNDO_DELAY_MS)
    },
    [clearTimer, confirm, qc, showToast],
  )

  const deleteWorld = useCallback(
    ({ id, name }) => {
      entriesRef.current.push({
        kind: 'world',
        id: String(id),
        url: `/worlds/${id}/`,
        queryKeys: [['worlds'], ['world', String(id)]],
        message: `Світ «${name || 'Світ'}» видалено`,
        nouns: ['світ', 'світи', 'світів'],
      })
      showToast(entriesRef.current)
      clearTimer()
      timerRef.current = setTimeout(confirm, UNDO_DELAY_MS)
    },
    [clearTimer, confirm, showToast],
  )

  const value = useMemo(() => ({ deleteItem, deleteWorld }), [deleteItem, deleteWorld])

  return (
    <UndoContext.Provider value={value}>
      {children}
      <UndoSnackbar
        open={toast.open}
        message={toast.text}
        seq={toast.seq}
        onUndo={undo}
        onExpire={confirm}
      />
    </UndoContext.Provider>
  )
}
