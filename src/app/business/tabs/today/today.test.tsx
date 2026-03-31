import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@testing-library/jest-dom'
import TodayPage from './page'
import InventoryPage from '../inventory/page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const TODAY_WEEKDAY = WEEKDAYS[new Date().getDay()]

const ITEM_ID = 1
const ITEM_NAME = 'Sourdough Loaf'
const QUOTA = 12

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useParams: () => ({ bakerySlug: 'test-bakery' }) }
})

function makeSchedule(qty = QUOTA) {
  return [{ itemId: ITEM_ID, weekday: TODAY_WEEKDAY, quantity: qty, item: { name: ITEM_NAME, slug: 'sourdough' } }]
}

function makeInventory(quantity: number) {
  return [{ itemId: ITEM_ID, quantity, item: { name: ITEM_NAME, slug: 'sourdough', par: null, category: null } }]
}

function makeFetch({
  inventory = makeInventory(20),
  schedule = makeSchedule(),
  todayBakes = [] as { id: number; itemId: number; quantity: number }[],
} = {}) {
  return vi.fn((url: string) => {
    if (url.includes('/inventory/bakes/today')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(todayBakes) })
    }
    if (url.includes('/inventory')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(inventory) })
    }
    if (url.includes('/production-schedule/overrides')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url.includes('/production-schedule')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(schedule) })
    }
    if (url.includes('/categories')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TodayPage — stock display consistency', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows the stock quantity from the inventory API in the bake card', async () => {
    vi.stubGlobal('fetch', makeFetch({ inventory: makeInventory(20) }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('20 in freezer')).toBeInTheDocument()
    })
  })

  it('reflects an updated stock level after an adjustment (fresh page load)', async () => {
    // Simulates: user adjusts stock in Inventory tab, then navigates to Today.
    // Today re-mounts and fetches the post-adjustment value from the API.
    const adjustedStock = 25
    vi.stubGlobal('fetch', makeFetch({ inventory: makeInventory(adjustedStock) }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(`${adjustedStock} in freezer`)).toBeInTheDocument()
    })
    expect(screen.queryByText('20 in freezer')).not.toBeInTheDocument()
  })

  it('shows post-bake remaining stock when item was already baked today', async () => {
    const bakedQty = 12
    const stockAfterBake = 8 // backend decremented inventory on bake

    vi.stubGlobal('fetch', makeFetch({
      inventory: makeInventory(stockAfterBake),
      todayBakes: [{ id: 99, itemId: ITEM_ID, quantity: -bakedQty }],
    }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      // Baked item shows "left in freezer" with the post-bake stock
      expect(screen.getByText(`${stockAfterBake} left in freezer`)).toBeInTheDocument()
    })
  })

  it('marks item as baked when today-bakes API returns a transaction for it', async () => {
    vi.stubGlobal('fetch', makeFetch({
      inventory: makeInventory(8),
      todayBakes: [{ id: 99, itemId: ITEM_ID, quantity: -12 }],
    }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('Baked ✓')).toBeInTheDocument()
    })
  })

  it('item is not shown as baked when today-bakes returns no transactions', async () => {
    vi.stubGlobal('fetch', makeFetch({ inventory: makeInventory(20), todayBakes: [] }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(ITEM_NAME)).toBeInTheDocument()
    })
    expect(screen.queryByText('Baked ✓')).not.toBeInTheDocument()
  })

  it('zero-stock item is not tappable (cannot open bake modal)', async () => {
    vi.stubGlobal('fetch', makeFetch({ inventory: makeInventory(0) }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(ITEM_NAME)).toBeInTheDocument()
    })

    // canTap = !isBaked && stock > 0, so the card should not be a button
    const nameEl = screen.getByText(ITEM_NAME)
    const card = nameEl.closest('button')
    expect(card).toBeNull()
  })

  it('bake modal quantity is capped at available stock', async () => {
    const stock = 5 // less than quota (12)
    vi.stubGlobal('fetch', makeFetch({ inventory: makeInventory(stock) }))
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    const cardBtn = await screen.findByRole('button', { name: new RegExp(ITEM_NAME) })
    fireEvent.click(cardBtn)

    // Modal opens — initial count is min(quota, stock) = 5
    await waitFor(() => {
      expect(screen.getByLabelText('Increase quantity')).toBeInTheDocument()
    })
    const increaseBtn = screen.getByLabelText('Increase quantity')

    // Tap increase many times — count must never exceed stock
    for (let i = 0; i < 20; i++) fireEvent.click(increaseBtn)

    // The large number displayed in the modal should not exceed stock
    const countEl = screen.getByText(String(stock))
    expect(countEl).toBeInTheDocument()
    expect(screen.queryByText(String(stock + 1))).not.toBeInTheDocument()
  })
})

// ─── Cross-page stock consistency ─────────────────────────────────────────────
//
// The today page shows TWO numbers for each scheduled item:
//   - Large bold number: the QUOTA (target to bake) — e.g. 32
//   - Small "in freezer" text: the STOCK level       — e.g. 8
//
// The inventory page shows the STOCK level as its large number.
//
// These tests pin that the "in freezer" value on today always matches
// the quantity shown on the inventory page for the same item.

describe('cross-page: today "in freezer" matches inventory page stock', () => {
  // Mirrors the real-world case reported: oatmeal raisin has 8 in stock
  // but today's quota is 32. The large "32" on today is the quota/target,
  // NOT the stock — the stock (8) appears in the smaller "in freezer" label.
  const OATMEAL_RAISIN_ID = 2
  const OATMEAL_RAISIN_NAME = 'Oatmeal Raisin'
  const QUOTA_32 = 32
  const STOCK_8 = 8

  const oatmealInventory = [{
    itemId: OATMEAL_RAISIN_ID,
    quantity: STOCK_8,
    item: { name: OATMEAL_RAISIN_NAME, slug: 'oatmeal-raisin', par: null, defaultBatchQty: null, category: null },
  }]

  const oatmealSchedule = [{
    itemId: OATMEAL_RAISIN_ID,
    weekday: TODAY_WEEKDAY,
    quantity: QUOTA_32,
    item: { name: OATMEAL_RAISIN_NAME, slug: 'oatmeal-raisin' },
  }]

  function makeOatmealFetch() {
    return vi.fn((url: string) => {
      if (url.includes('/inventory/bakes/today')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      if (url.includes('/inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(oatmealInventory) })
      }
      if (url.includes('/production-schedule/overrides')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      if (url.includes('/production-schedule')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(oatmealSchedule) })
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })
  }

  beforeEach(() => vi.restoreAllMocks())

  it('today page shows 8 in freezer (stock), not 32 (quota), for oatmeal raisin', async () => {
    vi.stubGlobal('fetch', makeOatmealFetch())
    render(<MemoryRouter><TodayPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(OATMEAL_RAISIN_NAME)).toBeInTheDocument()
    })

    // The stock (8) must appear as the "in freezer" label
    expect(screen.getByText(`${STOCK_8} in freezer`)).toBeInTheDocument()

    // The 32 visible on the card is the quota/target, not the stock
    expect(screen.getByText('target')).toBeInTheDocument()
  })

  it('inventory page shows 8 as the stock number for oatmeal raisin', async () => {
    vi.stubGlobal('fetch', makeOatmealFetch())
    render(<MemoryRouter><InventoryPage /></MemoryRouter>)

    const card = await screen.findByRole('button', { name: new RegExp(OATMEAL_RAISIN_NAME) })
    expect(within(card).getByText(String(STOCK_8))).toBeInTheDocument()
  })

  it('"in freezer" on today page equals the stock number on inventory page', async () => {
    // Today page
    vi.stubGlobal('fetch', makeOatmealFetch())
    const { unmount } = render(<MemoryRouter><TodayPage /></MemoryRouter>)

    const freezerLabel = await screen.findByText(`${STOCK_8} in freezer`)
    const freezerStock = parseInt(freezerLabel.textContent ?? '', 10)
    unmount()

    // Inventory page (same mock)
    vi.stubGlobal('fetch', makeOatmealFetch())
    render(<MemoryRouter><InventoryPage /></MemoryRouter>)

    const card = await screen.findByRole('button', { name: new RegExp(OATMEAL_RAISIN_NAME) })
    const inventoryStock = parseInt(within(card).getByText(String(STOCK_8)).textContent ?? '', 10)

    expect(freezerStock).toBe(inventoryStock)
  })
})
