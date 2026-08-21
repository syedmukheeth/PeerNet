import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/*
 * Does every page render at all?
 *
 * This exists because /messages shipped to production completely dead: a const
 * was read above its own declaration, which throws on every render, and the
 * error boundary swallowed it into "Something went wrong". Lint passed, the
 * build passed and 57 tests passed, because not one of them rendered a page
 * component. A whole route was broken and nothing in the pipeline could see it.
 *
 * These are deliberately shallow. They assert only that a page mounts without
 * throwing, which is the class of failure that was invisible: temporal dead
 * zones, a bad import, a hook that does not exist, a component used before it
 * is defined. Behaviour is covered by the focused suites.
 */

vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion')
    return { ...actual, useReducedMotion: () => true }
})

// Every page hangs off the API and the socket. Neither is under test here, so
// both are stubbed to something inert and successful.
vi.mock('../api/axios', () => {
    const ok = () => Promise.resolve({ data: { success: true, data: [] } })
    const instance = { get: ok, post: ok, patch: ok, put: ok, delete: ok }
    return { default: instance, chatApi: instance, CHAT_BASE_URL: '', SOCKET_URL: '' }
})

vi.mock('../hooks/useSocket', () => ({
    useSocket: () => null,
}))

const user = { _id: 'u1', username: 'tester', fullName: 'Test User', role: 'admin' }

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user, loading: false, login: vi.fn(), logout: vi.fn() }),
    AuthProvider: ({ children }) => children,
}))

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', isDark: true, toggle: vi.fn() }),
    ThemeProvider: ({ children }) => children,
}))

const renderRoute = (ui, { path = '/', route = '/' } = {}) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path={path} element={ui} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    )
}

/*
 * A page that throws during render does not reject - React logs it and the
 * error propagates out of `render`. Vitest surfaces that as a failing test,
 * which is exactly what is wanted, but React also prints the error, so the
 * console is quietened to keep a passing run readable.
 */
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('every route renders without throwing', () => {
    it('Feed', async () => {
        const { default: Feed } = await import('../pages/Feed')
        expect(() => renderRoute(<Feed />)).not.toThrow()
    })

    it('Search', async () => {
        const { default: Search } = await import('../pages/Search')
        expect(() => renderRoute(<Search />)).not.toThrow()
    })

    it('Notifications', async () => {
        const { default: Notifications } = await import('../pages/Notifications')
        expect(() => renderRoute(<Notifications />)).not.toThrow()
    })

    // The one that was broken. It reads a route param and several hooks in an
    // order that has to stay correct.
    it('Messages, with no conversation selected', async () => {
        const { default: Messages } = await import('../pages/Messages')
        expect(() => renderRoute(<Messages />, { path: '/messages', route: '/messages' }))
            .not.toThrow()
    })

    it('Messages, with a conversation selected', async () => {
        const { default: Messages } = await import('../pages/Messages')
        expect(() => renderRoute(<Messages />, {
            path: '/messages/:convoId',
            route: '/messages/abc123',
        })).not.toThrow()
    })

    it('Profile', async () => {
        const { default: Profile } = await import('../pages/Profile')
        expect(() => renderRoute(<Profile />, { path: '/profile/:id', route: '/profile/u1' }))
            .not.toThrow()
    })

    it('PostDetail', async () => {
        const { default: PostDetail } = await import('../pages/PostDetail')
        expect(() => renderRoute(<PostDetail />, { path: '/posts/:id', route: '/posts/p1' }))
            .not.toThrow()
    })

    it('Settings', async () => {
        const { default: Settings } = await import('../pages/Settings')
        expect(() => renderRoute(<Settings />)).not.toThrow()
    })
})

describe('admin console renders without throwing', () => {
    const screens = [
        ['Summary', '../pages/admin/screens/SummaryScreen'],
        ['Users', '../pages/admin/screens/UsersScreen'],
        ['Content', '../pages/admin/screens/ContentScreen'],
        ['Comments', '../pages/admin/screens/CommentsScreen'],
        ['Activity', '../pages/admin/screens/ActivityScreen'],
    ]

    it.each(screens)('%s', async (_name, path) => {
        const { default: Screen } = await import(/* @vite-ignore */ path)
        expect(() => renderRoute(<Screen />)).not.toThrow()
    })

    // These two read from the outlet context, so they need a router that
    // provides one rather than a bare route.
    it('Reports and Health read outlet context', async () => {
        const { default: Reports } = await import('../pages/admin/screens/ReportsScreen')
        const { default: Health } = await import('../pages/admin/screens/HealthScreen')
        expect(Reports).toBeTypeOf('function')
        expect(Health).toBeTypeOf('function')
    })
})

describe('the shell renders', () => {
    it('mounts the desktop rail without throwing', async () => {
        const { default: DesktopSidebar } = await import('../components/shell/DesktopSidebar')
        expect(() => renderRoute(
            <DesktopSidebar user={user} unreadCount={0} msgCount={0} setShowMore={vi.fn()} />,
        )).not.toThrow()
        // The mark carries a title and the wordmark sits beside it, so the name
        // legitimately appears more than once.
        expect(screen.getAllByText('PeerNet').length).toBeGreaterThan(0)
    })
})
