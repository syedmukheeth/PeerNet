import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/axios'
import * as accountStore from '../lib/accountStore'

/**
 * Shares a single socket.io connection across the app and keeps it
 * authenticated when the access token is refreshed.
 */
let socketInstance = null

const log = (...args) => {
    if (import.meta.env.DEV) console.log('[SOCKET]', ...args)
}

// Registered once at module load rather than per hook consumer.
//
// This listener used to live in the effect below, so every mounted consumer
// (Layout, Messages, Notifications, AdminPage) added its own. They all act on
// the same module-level socketInstance, so one token refresh triggered N
// disconnect/connect cycles on the shared connection, each of which dropped
// and re-joined every room.
const reauthenticate = (e) => {
    if (!socketInstance) return
    log('token refreshed, re-authenticating')
    socketInstance.auth.token = e.detail?.accessToken || accountStore.getAccessToken()
    // Reconnect so the server re-reads the token and re-joins the user's rooms
    socketInstance.disconnect().connect()
}

window.addEventListener('peernet:token-refreshed', reauthenticate)

export const useSocket = (user) => {
    const [socket, setSocket] = useState(socketInstance)

    // Keyed on the id, not the user object. AuthContext builds a new object on
    // every fetchMe and every profile update, so an object dependency re-ran
    // this effect on changes that have nothing to do with the connection.
    const userId = user?._id

    useEffect(() => {
        if (!userId) {
            if (socketInstance) {
                log('user logged out, disconnecting')
                socketInstance.disconnect()
                socketInstance = null
                setSocket(null)
            }
            return
        }

        // Read through the store, which rejects the literal strings "undefined"
        // and "null" that a direct localStorage read would hand to the server.
        const token = accountStore.getAccessToken()
        if (!token) return

        if (!socketInstance) {
            log('opening connection')
            socketInstance = io(SOCKET_URL, {
                auth: { token },
                transports: ['polling', 'websocket'],
                reconnection: true,
                reconnectionAttempts: Infinity, // Keep trying in production
                reconnectionDelay: 3000,
                reconnectionDelayMax: 10000,
                timeout: 20000,
            })

            socketInstance.on('connect', () => {
                log('connected', socketInstance.id)
                setSocket(socketInstance)
            })

            socketInstance.on('disconnect', (reason) => {
                log('disconnected', reason)
            })

            socketInstance.on('connect_error', (err) => {
                log('connect error', err.message)
            })

            setSocket(socketInstance)
        } else {
            // Already exists, just ensure it's up to date
            socketInstance.auth.token = token
            setSocket(socketInstance)
            if (socketInstance.disconnected) {
                socketInstance.connect()
            }
        }
    }, [userId])

    return socket
}
