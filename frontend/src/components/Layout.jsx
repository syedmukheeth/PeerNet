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
import { useQueryClient } from '@tanstack/react-query'

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

            setUnreadCount(notifRes.data.count || 0)
            unreadRef.current = notifRes.data.count || 0

            // If user is already on messages, don't show the global badge
            const isAtMessages = window.location.pathname.startsWith('/messages')
            const count = msgRes.data.count || 0
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

    // Clear the badge when entering messages, restore it on the way out
    useEffect(() => {
        setMsgCount(location.pathname.startsWith('/messages') ? 0 : msgRef.current)
    }, [location.pathname])

    const showNotifToast = useCallback((notif) => {
        const typeEmoji = { like: '❤️', comment: '💬', follow: '👤', message: '💬', reply: '💬' }
        const typeText = {
            like: notif.entityModel === 'Comment' ? 'liked your comment' : 'liked your post',
            comment: 'commented on your post',
            reply: 'replied to your comment',
            follow: 'started following you'
        }
        const targetUrl = notif.targetUrl || '/notifications';

        toast((t) => (
            <div onClick={() => { navigate(targetUrl); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={notif.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.sender?.username || 'User'}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-accent flex items-center justify-center text-[10px] border-2 border-surface shadow-sm">
                        {typeEmoji[notif.type]}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-primary">
                        {notif.sender?.username} <span className="font-medium text-secondary">{typeText[notif.type]}</span>
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
        const preview = msg.body?.length > 40 ? msg.body.slice(0, 40) + '…' : (msg.body || '📷 Photo')

        toast((t) => (
            <div onClick={() => { navigate(`/messages/${convoId || ''}`); toast.dismiss(t.id) }} className="flex items-center gap-3 cursor-pointer">
                <div className="relative flex-shrink-0">
                    <img src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${senderName}&background=6366F1&color=fff`} className="w-10 h-10 rounded-full object-cover border border-border-md" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center text-[9px] border-2 border-surface shadow-sm">💬</div>
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
            msgRef.current += 1
            setMsgCount(msgRef.current)

            // Invalidate conversations to update unread counts/previews
            queryClient.invalidateQueries({ queryKey: ['conversations'] })

            if (!location.pathname.startsWith('/messages')) showMsgToast(msg)
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
    const avatarUrl = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

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
                    className={`layout-container ${isMessages ? 'h-full' : ''} ${(!['/messages', '/admin'].some(p => location.pathname.startsWith(p))) ? 'content-wrap' : ''}`}
                >

                    <div className={isMessages ? 'h-full' : ''}>
                        <Outlet />
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
