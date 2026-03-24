import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@testing-library/jest-dom'
import InventoryPage from './page'

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
