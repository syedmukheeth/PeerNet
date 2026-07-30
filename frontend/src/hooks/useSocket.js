import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/axios'

/**
 * Shares a single socket.io connection across the app and keeps it
 * authenticated when the access token is refreshed.
 */
let socketInstance = null

const log = (...args) => {
    if (import.meta.env.DEV) console.log('[SOCKET]', ...args)
}

export const useSocket = (user) => {
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user) {
            if (socketInstance) {
                log('user logged out, disconnecting')
                socketInstance.disconnect()
                socketInstance = null
                setSocket(null)
            }
            return
        }

        const connect = () => {
            const token = localStorage.getItem('accessToken')
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
        }

        connect()

        const handleRefresh = (e) => {
            if (!socketInstance) return
            log('token refreshed, re-authenticating')
            socketInstance.auth.token = e.detail?.accessToken || localStorage.getItem('accessToken')
            // Reconnect so the server re-reads the token and re-joins the user's rooms
            socketInstance.disconnect().connect()
        }

        window.addEventListener('peernet:token-refreshed', handleRefresh)

        return () => {
            window.removeEventListener('peernet:token-refreshed', handleRefresh)
        }
    }, [user])

    return socket
}
