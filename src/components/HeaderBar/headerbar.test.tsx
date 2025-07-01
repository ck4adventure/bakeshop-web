import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeaderBar from './HeaderBar'
import { MemoryRouter } from 'react-router'
import '@testing-library/jest-dom'

// Mock useAuth
const mockLogout = vi.fn();
vi.mock("@/context/auth", () => ({
  useAuth: () => ({
    logout: mockLogout,
    user: { username: "testuser" },
    loading: false,
    login: vi.fn(),
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual: typeof import("react-router") = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// When a component uses <Link> or <useNavigate>, need to wrap it in <MemoryRouter>
describe('HeaderBar', () => {
	it('renders the logo text', () => {
		render(
			<MemoryRouter>
				<HeaderBar />
			</MemoryRouter>
		)

		expect(screen.getByText('Bakedown')).toBeInTheDocument()
	})

	it('renders the logout button', () => {
		render(
			<MemoryRouter>
				<HeaderBar />
			</MemoryRouter>
		)

		expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
	})

	it('calls the logout handler when the logout button is clicked', () => {
		// Mock the logout handler if it's passed as a prop, or mock the implementation if using context
		render(
			<MemoryRouter>
				<HeaderBar />
			</MemoryRouter>
		)

		const button = screen.getByRole('button', { name: /log out/i })
		button.click()
		expect(mockLogout).toHaveBeenCalled()
	})
})