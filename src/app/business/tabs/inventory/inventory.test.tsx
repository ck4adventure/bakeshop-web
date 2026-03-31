import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@testing-library/jest-dom'
import InventoryPage from './page'

// ─── Shared mock helpers ───────────────────────────────────────────────────────

function makeInvFetch(inventory: object[], adjustOk = true) {
  return vi.fn((url: string, options?: RequestInit) => {
    if (url.includes('/production-schedule')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url.includes('/categories')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url.includes('/inventory/adjust')) {
      return Promise.resolve({
        ok: adjustOk,
        json: () => Promise.resolve(adjustOk ? { id: 1 } : { message: 'Adjustment would put stock below zero' }),
      })
    }
    if (url.includes('/batches') && options?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(inventory) })
  })
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// ItemInventory has no separate `id` field — itemId is the @id in the schema.
// The API response therefore has no `id` property on each record.
const mockInventory = [
  {
    itemId: 1,
    quantity: 10,
    updatedAt: '2024-01-01T00:00:00Z',
    item: { name: 'Chocolate Chip Cookies', slug: 'choc-chip', par: null, defaultBatchQty: 12 },
  },
  {
    itemId: 2,
    quantity: 20,
    updatedAt: '2024-01-01T00:00:00Z',
    item: { name: 'Brookies', slug: 'brookies', par: null, defaultBatchQty: null },
  },
]

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useParams: () => ({ bakerySlug: 'test-bakery' }) }
})

describe('InventoryPage — batch optimistic update', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/production-schedule')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      if (url.includes('/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ itemId: 1, quantity: 12, reason: 'BATCH' }),
        })
      }
      // /inventory
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInventory) })
    }))
  })

  it('only updates the batched item quantity, leaving other items unchanged', async () => {
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    )

    // Wait for inventory to load
    const chocChipCard = await screen.findByRole('button', { name: /Chocolate Chip Cookies/i })
    const brookiesCard = screen.getByRole('button', { name: /Brookies/i })

    // Sanity check initial quantities
    expect(within(chocChipCard).getByText('10')).toBeInTheDocument()
    expect(within(brookiesCard).getByText('20')).toBeInTheDocument()

    // Open the modal for Chocolate Chip Cookies and save a batch (defaultBatchQty = 12)
    fireEvent.click(chocChipCard)
    const saveBatchBtn = await screen.findByRole('button', { name: /Save Batch/i })
    fireEvent.click(saveBatchBtn)

    // Choc chips should increase by 12 → 22; Brookies must stay at 20
    await waitFor(() => {
      expect(within(screen.getByRole('button', { name: /Chocolate Chip Cookies/i })).getByText('22')).toBeInTheDocument()
      expect(within(screen.getByRole('button', { name: /Brookies/i })).getByText('20')).toBeInTheDocument()
    })
  })
})

// ─── Adjustment: negative stock prevention ────────────────────────────────────

describe('InventoryPage — adjustment cannot push stock negative', () => {
  const stockItem = {
    itemId: 1,
    quantity: 5,
    item: { name: 'Croissant', slug: 'croissant', par: null, defaultBatchQty: null, category: null },
  }

  async function openAdjustPanel() {
    vi.stubGlobal('fetch', makeInvFetch([stockItem]))
    render(<MemoryRouter><InventoryPage /></MemoryRouter>)
    const card = await screen.findByRole('button', { name: /Croissant/i })
    fireEvent.click(card)
    const adjustTab = await screen.findByRole('button', { name: /Adjust Stock/i })
    fireEvent.click(adjustTab)
  }

  it('minus stepper clamps at -stock so newStock cannot go below zero', async () => {
    await openAdjustPanel()
    const minusBtn = screen.getByRole('button', { name: /Decrease/i })

    // Tap minus 10× — stock is 5, so delta must clamp at -5 (newStock = 0)
    for (let i = 0; i < 10; i++) fireEvent.click(minusBtn)

    // Preview shows → 0, not → -1 or lower
    expect(screen.getByText('→ 0')).toBeInTheDocument()
    expect(screen.queryByText(/→ -[1-9]/)).not.toBeInTheDocument()
  })

  it('save button is disabled when a typed delta would produce negative stock', async () => {
    await openAdjustPanel()
    const input = screen.getByRole('spinbutton')

    fireEvent.change(input, { target: { value: '-10' } })
    fireEvent.blur(input) // triggers clamp

    const saveBtn = screen.getByRole('button', { name: /Save Adjustment/i })
    expect(saveBtn).toBeDisabled()
  })

  it('input is clamped to -stock on blur so newStock floors at zero', async () => {
    await openAdjustPanel()
    const input = screen.getByRole('spinbutton')

    fireEvent.change(input, { target: { value: '-99' } })
    fireEvent.blur(input)

    // After blur the displayed value is clamped to -5 → newStock = 0
    expect(input).toHaveValue(-5)
    expect(screen.getByText('→ 0')).toBeInTheDocument()
  })

  it('save button enables when delta equals -stock exactly (reduces to zero) with a note', async () => {
    await openAdjustPanel()
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '-5' } })

    const noteField = screen.getByPlaceholderText(/Dropped tray/i)
    fireEvent.change(noteField, { target: { value: 'Full recount' } })

    const saveBtn = screen.getByRole('button', { name: /Save Adjustment/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('after a successful negative adjustment the displayed stock decreases', async () => {
    vi.stubGlobal('fetch', makeInvFetch([stockItem]))
    render(<MemoryRouter><InventoryPage /></MemoryRouter>)

    const card = await screen.findByRole('button', { name: /Croissant/i })
    expect(within(card).getByText('5')).toBeInTheDocument()

    fireEvent.click(card)
    const adjustTab = await screen.findByRole('button', { name: /Adjust Stock/i })
    fireEvent.click(adjustTab)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '-3' } })

    const noteField = screen.getByPlaceholderText(/Dropped tray/i)
    fireEvent.change(noteField, { target: { value: 'Dropped tray' } })

    const saveBtn = screen.getByRole('button', { name: /Save Adjustment/i })
    fireEvent.click(saveBtn)

    // Modal closes and stock optimistically updates 5 − 3 = 2
    await waitFor(() => {
      const updatedCard = screen.getByRole('button', { name: /Croissant/i })
      expect(within(updatedCard).getByText('2')).toBeInTheDocument()
    })
  })
})
