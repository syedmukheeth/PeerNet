import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/axios'

/**
 * useSocket Hook - Big Tech Grade Socket Management
 * Handles singleton connection, auto-refresh on token change, 
 * and robust error handling.
 */
let socketInstance = null

export const useSocket = (user) => {
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user) {
            if (socketInstance) {
                console.log('[SOCKET] User logged out, disconnecting...')
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
                console.log('[SOCKET] Initializing singleton connection...')
                socketInstance = io(SOCKET_URL, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                })

                socketInstance.on('connect', () => {
                    console.log('[SOCKET] Connected:', socketInstance.id)
                    setSocket(socketInstance)
                })

                socketInstance.on('disconnect', (reason) => {
                    console.log('[SOCKET] Disconnected:', reason)
                })

                socketInstance.on('connect_error', (err) => {
                    console.error('[SOCKET] Connect error:', err.message)
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

        // Nuclear Fix: Listen for token refreshes to re-authenticate
        const handleRefresh = (e) => {
            console.log('[SOCKET] Token refreshed, re-authenticating socket...')
            if (socketInstance) {
                const newToken = e.detail?.accessToken || localStorage.getItem('accessToken')
                socketInstance.auth.token = newToken
                
                // Force a disconnect and reconnect to ensure the server sees the new token
                // and places the user in the correct room.
                socketInstance.disconnect().connect()
            }
        }

        window.addEventListener('peernet:token-refreshed', handleRefresh)

        return () => {
            window.removeEventListener('peernet:token-refreshed', handleRefresh)
        }
    }, [user])

    return socket
}
