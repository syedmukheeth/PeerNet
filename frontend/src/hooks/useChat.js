import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/axios'

// ZENITH SINGLETONS: These persist even when navigating away
const draftCache = {}
const scrollCache = {}

/**
 * Hook for managing conversations list
 */
export const useConvos = () => {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await chatApi.get('/')
            let data = res.data
            if (data?.data && Array.isArray(data.data)) return data.data
            if (data?.conversations && Array.isArray(data.conversations)) return data.conversations
            return Array.isArray(data) ? data : []
        },
        staleTime: 30000, // Background refresh every 30 seconds
    })
}

/**
 * Hook for managing messages in a specific conversation
 */
export const useMessages = (convoId) => {
    return useQuery({
        queryKey: ['messages', convoId],
        queryFn: async () => {
            if (!convoId) return []
            const res = await chatApi.get(`/${convoId}/messages`)
            let data = res.data
            if (data?.data && Array.isArray(data.data)) return data.data
            if (data?.messages && Array.isArray(data.messages)) return data.messages
            return Array.isArray(data) ? data : []
        },
        enabled: !!convoId,
        staleTime: 10000, // Background refresh every 10 seconds
    })
}

/**
 * Hook for persistent drafts and UI state
 */
export const useChatState = (convoId) => {
    const getDraft = () => draftCache[convoId] || ''
    const setDraft = (text) => { draftCache[convoId] = text }
    
    const getScroll = () => scrollCache[convoId] || 0
    const setScroll = (pos) => { scrollCache[convoId] = pos }

    return { getDraft, setDraft, getScroll, setScroll }
}

/**
 * Hook for sending messages with optimistic updates (Coming soon)
 */
export const useSendMessage = (convoId) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (text) => chatApi.post(`/${convoId}/messages`, { body: text }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
    })
}
