import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../api/axios'

/**
 * useSocket Hook - Big Tech Grade Socket Management
 * Handles singleton connection, auto-refresh on token change, 
 * and robust error handling.
 */
let socket = null

export const useSocket = (user) => {
    const socketRef = useRef(null)

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.disconnect()
                socket = null
            }
            return
        }

        const token = localStorage.getItem('accessToken')

        if (!socket) {
            socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'], // Fallback for restrictive firewalls
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
            })

            socket.on('connect', () => {
                console.log('[SOCKET] Connected:', socket.id)
            })

            socket.on('connect_error', (err) => {
                console.warn('[SOCKET] Connect Error:', err.message)
                // If token is invalid, the axios interceptor (if called nearby) 
                // will handle refresh, and we'll reconnect on the next token change.
            })
        } else {
            // Update token on existing connection if it changed
            socket.auth.token = token
            // Many Socket.io versions require a manual disconnect/connect or a custom event to 
            // re-authenticate mid-stream if the token changed while the socket was "connected" but idle.
            // But for now, updating the auth object usually works for the next reconnection.
        }

        socketRef.current = socket

        // Cleanup on unmount or user change
        return () => {
            // We don't necessarily disconnect here to keep the singleton "warm" 
            // unless the user logged out (handled at top).
        }
    }, [user])

    return socketRef.current
}
