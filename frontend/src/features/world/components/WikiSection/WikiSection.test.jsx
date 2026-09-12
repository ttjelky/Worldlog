// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import api from '../../../../api'
import ExpandableCard from '../shared/ExpandableCard'
import UndoProvider from '../../../../shared/undo/UndoProvider'
import FeedbackProvider from '../../../../shared/feedback/FeedbackProvider'
import WikiSection from './WikiSection'

vi.mock('../../../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const pages = [
  {
    id: 1,
    world: 1,
    title: 'Дракон',
    page_type: 'character',
    emoji: '🧙',
    infobox: {},
    tags: '',
    world_date: '',
    content: 'Друг [[Замок]] і ворог [[Нова]]',
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
  },
]

function mockApi() {
  api.get.mockImplementation((url) => {
    if (url.includes('/wiki/')) return Promise.resolve({ data: pages.map((p) => ({ ...p })) })
    return Promise.resolve({ data: [] })
  })
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <UndoProvider>
          <FeedbackProvider>
            <ExpandableCard>
              <WikiSection worldId="1" accent="#a33" userRole="owner" />
            </ExpandableCard>
          </FeedbackProvider>
        </UndoProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

async function openModal() {
  fireEvent.click(screen.getByLabelText('Розгорнути картку'))
  return screen.findByRole('dialog')
}

describe('WikiSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => cleanup())

  it('warns about duplicate title and blocks save', async () => {
    setup()
    const dialog = await openModal()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Нова сторінка' }))
    // Редактор чернетки — окремим порталом, назва — bare-редактор
    const titleEl = await screen.findByLabelText('Назва сторінки')
    titleEl.textContent = 'дракон'
    fireEvent.input(titleEl, {})
    await waitFor(() => {
      expect(screen.getByText('Сторінка з такою назвою вже існує — обери іншу.'))
        .not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Створити' }).disabled).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
    // Емодзі — компактний дропдаун зліва від назви, а не сітка
    expect(screen.getByLabelText('Емодзі').tagName).toBe('SELECT')
  })

  it('creates a page from a broken link with prefilled title', async () => {
    setup()
    const dialog = await openModal()
    await within(dialog).findByText('Дракон')
    fireEvent.click(within(dialog).getByText('Дракон'))
    // Деталі сторінки відкрились у модалці (кнопка «Назад» є лише там)
    await within(dialog).findByRole('button', { name: 'Назад' })
    fireEvent.click(within(dialog).getByText('Нова'))
    // Чернетка з підставленою назвою — окремим порталом
    const titleEl = await screen.findByLabelText('Назва сторінки')
    await waitFor(() => {
      expect(titleEl.textContent).toBe('Нова')
    })
  })
})
