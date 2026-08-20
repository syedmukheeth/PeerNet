import { Outlet, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import CreatePostModal from './CreatePostModal'
import FeedbackModal from './FeedbackModal'
import AccountSwitcherModal from './AccountSwitcherModal'
import DesktopSidebar from './shell/DesktopSidebar'
import MobileHeader from './shell/MobileHeader'
import MobileNav from './shell/MobileNav'
import SiteFooter from './shell/SiteFooter'
import ErrorBoundary from './ErrorBoundary'
import { Icon } from './ui/icons'
import { notificationCopy } from '../utils/notificationCopy'
import { useQueryClient } from '@tanstack/react-query'
import avatarFallback from './ui/avatarFallback'

/*
 * The data layer for the app shell: unread/message counts, the socket
 * listeners that keep them live, and the create/feedback/switcher modal
 * triggers. The chrome itself (sidebar, mobile header, bottom nav, footer)
 * lives in ./shell/ - split out so each piece can be read and changed on its
 * own, with every CSS class name kept exactly as it was so none of the
 * layout rules in index.css that target them by name have to change.
 */
export default function Layout() {
    const { user, logout } = useAuth()
    const { isDark, toggle } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const socket = useSocket(user)
    const queryClient = useQueryClient()

    const [showCreate, setShowCreate] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [showSwitcher, setShowSwitcher] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [msgCount, setMsgCount] = useState(0)
    const unreadRef = useRef(0)
    const msgRef = useRef(0)
    const mainRef = useRef(null)
    const [showMore, setShowMore] = useState(false)
    const moreRef = useRef(null)
    const mobileMenuBtnRef = useRef(null)
    const mobilePopupRef = useRef(null)

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
        }
    }, [location.pathname])

    useEffect(() => {
        // Apply locked state for dashboard layout
        document.documentElement.classList.add('layout-locked');
        return () => document.documentElement.classList.remove('layout-locked');
    }, []);


    const syncAllCounts = useCallback(async () => {
        if (!user) return
        try {
            const [notifRes, msgRes] = await Promise.all([
                api.get('/notifications/unread-count'),
                chatApi.get('unread-count')
            ])

            // Both endpoints return the standard { success, data } envelope now,
            // rather than a bare top-level count.
            const notifCount = notifRes.data.data?.count || 0
            setUnreadCount(notifCount)
            unreadRef.current = notifCount

            // If user is already on messages, don't show the global badge
            const isAtMessages = window.location.pathname.startsWith('/messages')
            const count = msgRes.data.data?.count || 0
            const displayCount = isAtMessages ? 0 : count

            setMsgCount(displayCount)
            msgRef.current = count
        } catch (err) {
            console.warn('[Layout] Sync failed', err)
        }
    }, [user])

    useEffect(() => {
        const handleSync = () => syncAllCounts()
        window.addEventListener('peernet:sync-counts', handleSync)
        return () => window.removeEventListener('peernet:sync-counts', handleSync)
    }, [syncAllCounts])

    // Clear the badge when entering messages. On the way out, re-sync from the
    // server rather than restoring msgRef: that ref is only ever incremented,
    // never decremented as messages are read, so leaving /messages used to
    // resurrect a count for conversations the user had just read.
    useEffect(() => {
        if (location.pathname.startsWith('/messages')) {
            setMsgCount(0)
        } else {
            syncAllCounts()
        }
    }, [location.pathname, syncAllCounts])

    const showNotifToast = useCallback((notif) => {
        /*
         * The same description the notifications list uses. This carried its
         * own map, which covered four types and disagreed with the page on what
         * a like on a comment says. A new type had to be added in two places
         * and was invariably added to one.
         *
         * Icons, not emoji: an emoji rendered as whatever glyph the operating
         * system happened to ship, which is why the badge looked like a
         * different app on Windows than on iOS.
         */
        const copy = notificationCopy(notif)
        const targetUrl = notif.targetUrl || '/notifications';

        toast((t) => (
            <div onClick={() => { navigate(targetUrl); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={notif.sender?.avatarUrl || avatarFallback(notif.sender?.username || 'User')} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-accent text-accent-fg flex items-center justify-center border-2 border-surface">
                        <Icon name={copy.icon} size={10} />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-primary">
                        {notif.sender?.username} <span className="font-medium text-secondary">{copy.text}</span>
                    </p>
                </div>
            </div>
        ), {
            className: 'glass-toast',
            style: { background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)' }
        })
    }, [navigate])

    const showMsgToast = useCallback((msg) => {
        const senderName = msg.sender?.username || 'Someone'
        const convoId = msg.conversationId
        const preview = msg.body?.length > 40 ? msg.body.slice(0, 40) + '…' : (msg.body || 'Photo')

        toast((t) => (
            <div onClick={() => { navigate(`/messages/${convoId || ''}`); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={msg.sender?.avatarUrl || avatarFallback(senderName)} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-accent text-accent-fg flex items-center justify-center border-2 border-surface">
                        <Icon name="chat" size={10} />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-primary">{senderName}</p>
                    <p className="m-0 text-[12px] text-muted truncate">{preview}</p>
                </div>
            </div>
        ), {
            className: 'glass-toast',
            style: { background: 'var(--card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)' }
        })
    }, [navigate])

    useEffect(() => {
        if (!socket || !user) return
        const onNewNotif = (notif) => { unreadRef.current += 1; setUnreadCount(unreadRef.current); showNotifToast(notif) }
        const onSync = () => syncAllCounts()
        const onConnect = () => { syncAllCounts(); socket.emit('ping_online') }

        socket.on('new_notification', onNewNotif)
        socket.on('sync_counts', onSync)
        socket.on('connect', onConnect)

        if (socket.connected) onConnect()

        return () => {
            socket.off('new_notification', onNewNotif)
            socket.off('sync_counts', onSync)
            socket.off('connect', onConnect)
        }
    }, [socket, user, syncAllCounts, showNotifToast])

    useEffect(() => {
        if (!socket || !user) return
        const onMsg = (msg) => {
            if (msg.sender?._id === user?._id) return

            /*
             * Mute now means something. It was stored, shown as a setting and
             * read by nothing, so muting a conversation changed no behaviour at
             * all: the toast and the badge fired exactly as before.
             *
             * A muted thread still updates its unread count in the list - you
             * should be able to see it waiting - it just stops interrupting.
             */
            const isMuted = queryClient
                .getQueriesData({ queryKey: ['conversations'] })
                .flatMap(([, list]) => (Array.isArray(list) ? list : []))
                .some((c) => c._id === msg.conversationId && c.isMuted)

            if (!isMuted) {
                msgRef.current += 1
                setMsgCount(msgRef.current)
            }

            // Invalidate conversations to update unread counts/previews
            queryClient.invalidateQueries({ queryKey: ['conversations'] })

            // And the open thread. Only the conversation list was invalidated
            // before, so a message arriving while you had that conversation on
            // screen did not appear: useMessages has a 10s staleTime and
            // refetchOnWindowFocus disabled, so nothing refetched it.
            if (msg.conversationId) {
                queryClient.invalidateQueries({ queryKey: ['messages', msg.conversationId] })
            }

            if (!isMuted && !location.pathname.startsWith('/messages')) showMsgToast(msg)
        }
        socket.on('new_message', onMsg)
        return () => socket.off('new_message', onMsg)
    }, [socket, user, location.pathname, showMsgToast, queryClient])

    useEffect(() => {
        if (!socket || !user) return

        const onStatusChange = ({ userId, isOnline, lastSeen }) => {
            // Update conversations list cache
            queryClient.setQueryData(['conversations'], (old) => {
                if (!old) return old
                return old.map(convo => {
                    const participants = convo.participants?.map(p =>
                        p._id === userId ? { ...p, isOnline, lastSeen } : p
                    )
                    return { ...convo, participants }
                })
            })

            // Also invalidate to be safe and get fresh data for other hooks
            queryClient.invalidateQueries({ queryKey: ['messages', { userId }] })
        }

        socket.on('user_status_change', onStatusChange)

        const onMessagesSeen = ({ conversationId, viewerId }) => {
            if (viewerId === user?._id) return
            queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) return old
                return old.map(m => {
                    const isMe = m.sender?._id === user?._id || m.sender === 'me'
                    if (isMe && m.status !== 'seen') {
                        return { ...m, status: 'seen' }
                    }
                    return m
                })
            })
        }
        socket.on('messages_seen', onMessagesSeen)

        return () => {
            socket.off('user_status_change', onStatusChange)
            socket.off('messages_seen', onMessagesSeen)
        }
    }, [socket, user, queryClient])

    // There used to be an effect here that re-saved the cached user against
    // whatever tokens were currently in localStorage. Across a switch reload it
    // fired with the PREVIOUS user and the NEW account's tokens, overwriting
    // that entry so two accounts pointed at one token and switching became a
    // no-op. Recording a session now happens only where the user and the tokens
    // arrive together: AuthContext's login/register/google/guest and fetchMe.

    const handleLogout = async () => { await logout(); navigate('/login') }
    const avatarUrl = user?.avatarUrl || avatarFallback(user?.username)

    useEffect(() => {
        if (!showMore) return
        const h = (e) => {
            // Desktop check
            if (moreRef.current && moreRef.current.contains(e.target)) return

            // Mobile check
            if (mobileMenuBtnRef.current && mobileMenuBtnRef.current.contains(e.target)) return
            if (mobilePopupRef.current && mobilePopupRef.current.contains(e.target)) return

            setShowMore(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showMore])

    const isMessages = location.pathname.startsWith('/messages')
    const isAdmin = location.pathname.startsWith('/admin')

    // Pages with no side rail read as a single column. Without this they
    // inherited the feed's 1200px shell, which is how the search field ended
    // up as wide as the window with two centred lines of text under it.
    const NARROW_ROUTES = ['/search', '/notifications', '/settings', '/about', '/help', '/privacy', '/terms']
    const isNarrow = NARROW_ROUTES.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))

    return (
        <div className="app-layout">
            {!isAdmin && (
                <DesktopSidebar
                    user={user}
                    unreadCount={unreadCount}
                    msgCount={msgCount}
                    avatarUrl={avatarUrl}
                    isDark={isDark}
                    toggle={toggle}
                    showMore={showMore}
                    setShowMore={setShowMore}
                    moreRef={moreRef}
                    onCreatePost={() => setShowCreate(true)}
                    onSwitchAccounts={() => setShowSwitcher(true)}
                    onLogout={handleLogout}
                />
            )}

            <MobileHeader
                user={user}
                unreadCount={unreadCount}
                msgCount={msgCount}
                isDark={isDark}
                toggle={toggle}
                showMore={showMore}
                setShowMore={setShowMore}
                mobileMenuBtnRef={mobileMenuBtnRef}
                mobilePopupRef={mobilePopupRef}
                onSwitchAccounts={() => setShowSwitcher(true)}
                onLogout={handleLogout}
            />

            <main className={`main-col ${isMessages ? 'h-full overflow-hidden' : ''} ${isAdmin ? 'main-col--admin' : ''}`} ref={mainRef}>
                <div
                    className={`layout-container ${isMessages ? 'h-full' : ''} ${(!['/messages', '/admin'].some(p => location.pathname.startsWith(p))) ? 'content-wrap' : ''} ${isNarrow ? 'content-wrap--narrow' : ''}`}
                >

                    {/*
                      Page-level boundary. A page that throws now keeps the
                      shell, the navigation and the socket connection alive
                      instead of blanking the whole app, and resetKey clears the
                      error on navigation so the failure is not sticky.
                    */}
                    <div className={isMessages ? 'h-full' : ''}>
                        <ErrorBoundary resetKey={location.pathname}>
                            <Outlet />
                        </ErrorBoundary>
                    </div>

                    {/* Site footer */}
                    {!['/messages', '/admin'].some(p => location.pathname.startsWith(p)) && (
                        <SiteFooter onReportBug={() => setShowFeedback(true)} />
                    )}
                </div>
            </main>

            {!(location.pathname.startsWith('/messages/') && location.pathname.split('/').filter(Boolean).length > 1) && (
                <MobileNav user={user} avatarUrl={avatarUrl} onCreatePost={() => setShowCreate(true)} />
            )}

            <AnimatePresence>
                {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
                {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
                {showSwitcher && <AccountSwitcherModal onClose={() => setShowSwitcher(false)} />}
            </AnimatePresence>
        </div>
    )
}
