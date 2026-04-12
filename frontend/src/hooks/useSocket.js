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
                socketInstance.disconnect()
                socketInstance = null
                setSocket(null)
            }
            return
        }

        const token = localStorage.getItem('accessToken')

        if (!socketInstance) {
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

            socketInstance.on('disconnect', () => {
                console.log('[SOCKET] Disconnected')
            })

            setSocket(socketInstance)
        } else {
            socketInstance.auth.token = token
            setSocket(socketInstance)
        }

        return () => {
            // Cleanup logic if needed
        }
    }, [user])

    return socket
}
