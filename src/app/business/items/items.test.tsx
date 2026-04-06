import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '@testing-library/jest-dom'
import ItemsPage from './page'

const mockItems = [
  { id: 1, name: 'Croissant', slug: 'croissant', par: 10, defaultBatchQty: 12, category: null },
]

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useParams: () => ({ bakerySlug: 'test-bakery' }), useNavigate: () => vi.fn() }
})

describe('ItemsPage — clearing optional fields', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body as string)
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockItems[0], ...body }) })
      }
      if (typeof url === 'string' && url.includes('/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      if (typeof url === 'string' && url.includes('/bakery/settings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ operatingDays: [] }) })
      }
      if (typeof url === 'string' && url.includes('/production-schedule')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockItems) })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('sends defaultBatchQty: null when the field is cleared on an existing item', async () => {
    render(
      <MemoryRouter>
        <ItemsPage />
      </MemoryRouter>
    )

    // Open edit sheet for Croissant
    const croissantBtn = await screen.findByRole('button', { name: /Croissant/i })
    fireEvent.click(croissantBtn)

    // Clear the defaultBatchQty field
    const batchQtyInput = await screen.findByLabelText(/default batch qty/i)
    fireEvent.change(batchQtyInput, { target: { value: '' } })

    // Save
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }))

    // The PATCH request body should explicitly include defaultBatchQty: null
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
      expect(patchCall).toBeDefined()
      const body = JSON.parse(patchCall![1].body)
      expect(body.defaultBatchQty).toBeNull()
    })
  })
})
