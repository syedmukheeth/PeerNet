import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/axios'
import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// ZENITH SINGLETONS: These persist even when navigating away
const draftCache = {}
const scrollCache = {}
const stateCache = {
    pinned: new Set(),
    muted: new Set(),
    archived: new Set()
}

/**
 * Hook for managing conversations list
 */
export const useConvos = () => {
    const queryClient = useQueryClient()
    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await chatApi.get('/')
            let data = res.data
            let list = []
            if (data?.data && Array.isArray(data.data)) list = data.data
            else if (data?.conversations && Array.isArray(data.conversations)) list = data.conversations
            else list = Array.isArray(data) ? data : []

            // Inject local state for Pin/Mute/Archive if backend doesn't support yet
            return list.map(c => ({
                ...c,
                isPinned: stateCache.pinned.has(c._id),
                isMuted: stateCache.muted.has(c._id),
                isArchived: stateCache.archived.has(c._id)
            }))
        },
        staleTime: 30000,
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
        staleTime: 10000,
    })
}

/**
 * Hook for persistent drafts and UI state
 */
export const useChatState = (convoId) => {
    const getDraft = useCallback(() => draftCache[convoId] || '', [convoId])
    const setDraft = useCallback((text) => { draftCache[convoId] = text }, [convoId])

    const getScroll = useCallback(() => scrollCache[convoId] || 0, [convoId])
    const setScroll = useCallback((pos) => { scrollCache[convoId] = pos }, [convoId])

    return { getDraft, setDraft, getScroll, setScroll }
}

/**
 * Hook for sending messages with optimistic updates
 */
export const useSendMessage = (convoId) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ text, replyToId, attachments }) =>
            chatApi.post(`/${convoId}/messages`, { body: text, replyTo: replyToId, attachments }),
        onMutate: async ({ text, replyToId }) => {
            await queryClient.cancelQueries({ queryKey: ['messages', convoId] })
            const previousMessages = queryClient.getQueryData(['messages', convoId])

            const optimisticMsg = {
                _id: 'temp-' + Date.now(),
                body: text,
                replyTo: replyToId ? { _id: replyToId } : null,
                sender: 'me',
                createdAt: new Date().toISOString(),
                isOptimistic: true,
                status: 'sending'
            }
            queryClient.setQueryData(['messages', convoId], old => [...(old || []), optimisticMsg])

            return { previousMessages }
        },
        onError: (err, text, context) => {
            queryClient.setQueryData(['messages', convoId], context.previousMessages)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
    })
}

/**
 * Hook for message actions (Reaction, Edit, Delete)
 */
export const useMessageActions = (convoId) => {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    const react = useMutation({
        mutationFn: ({ messageId, emoji }) => chatApi.post(`/${convoId}/messages/${messageId}/react`, { emoji }),
        onMutate: async ({ messageId, emoji }) => {
            await queryClient.cancelQueries({ queryKey: ['messages', convoId] })
            const prev = queryClient.getQueryData(['messages', convoId])
            queryClient.setQueryData(['messages', convoId], old => old?.map(m => {
                if (m._id !== messageId) return m
                const reactions = m.reactions || []
                
                // Find a reaction with this emoji that belongs to me
                const myReactionIndex = reactions.findIndex(r => 
                    r.emoji === emoji && (r.me === true || r.user === user?._id || r.userId === user?._id)
                )
                
                if (myReactionIndex > -1) {
                    // I have already reacted, so we remove mine
                    const newReactions = [...reactions]
                    const existing = newReactions[myReactionIndex]
                    
                    if (existing.count > 1) {
                        // It was a grouped reaction, decrement and unset 'me'
                        newReactions[myReactionIndex] = { ...existing, count: existing.count - 1, me: false }
                    } else {
                        // Single reaction, remove it
                        newReactions.splice(myReactionIndex, 1)
                    }
                    return { ...m, reactions: newReactions }
                } else {
                    // I haven't reacted yet. Check if this emoji group exists at all
                    const groupIndex = reactions.findIndex(r => r.emoji === emoji)
                    if (groupIndex > -1) {
                        // Add to existing group
                        const newReactions = [...reactions]
                        const existing = newReactions[groupIndex]
                        newReactions[groupIndex] = { ...existing, count: (existing.count || 1) + 1, me: true }
                        return { ...m, reactions: newReactions }
                    } else {
                        // Brand new emoji group
                        return { ...m, reactions: [...reactions, { emoji, count: 1, me: true }] }
                    }
                }
            }))
            return { prev }
        },
        onError: (err, variables, ctx) => queryClient.setQueryData(['messages', convoId], ctx.prev),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
    })

    const edit = useMutation({
        mutationFn: ({ messageId, text }) => chatApi.patch(`/${convoId}/messages/${messageId}`, { body: text }),
        onMutate: async ({ messageId, text }) => {
            await queryClient.cancelQueries({ queryKey: ['messages', convoId] })
            const prev = queryClient.getQueryData(['messages', convoId])
            queryClient.setQueryData(['messages', convoId], old =>
                old?.map(m => m._id === messageId ? { ...m, body: text, isEdited: true } : m)
            )
            return { prev }
        },
        onError: (err, data, ctx) => queryClient.setQueryData(['messages', convoId], ctx.prev),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
    })

    const remove = useMutation({
        mutationFn: (messageId) => chatApi.delete(`/${convoId}/messages/${messageId}`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['messages', convoId] })
            const prev = queryClient.getQueryData(['messages', convoId])
            queryClient.setQueryData(['messages', convoId], old => old?.filter(m => m._id !== id))
            return { prev }
        },
        onError: (err, id, ctx) => queryClient.setQueryData(['messages', convoId], ctx.prev),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
    })

    return { react, edit, remove }
}

/**
 * Hook for conversation management (Pin, Mute, Archive)
 * These run as local-only state toggles — backend endpoints are not yet implemented.
 * When backend support is added, swap mutationFn back to an API call.
 */
export const useConvoActions = () => {
    const queryClient = useQueryClient()

    const toggleState = (type, id) => {
        if (stateCache[type].has(id)) stateCache[type].delete(id)
        else stateCache[type].add(id)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    // Local-only toggle — no API call, no error
    const localMutate = (type) => ({
        mutate: (id) => toggleState(type, id),
        mutateAsync: async (id) => toggleState(type, id),
        isLoading: false,
        isPending: false,
    })

    return {
        pin: localMutate('pinned'),
        mute: localMutate('muted'),
        archive: localMutate('archived'),
    }
}

/**
 * Hook for permanently deleting a chat (for the current user)
 */
export const useDeleteChat = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (convoId) => chatApi.delete(`/${convoId}`),
        onMutate: async (convoId) => {
            await queryClient.cancelQueries({ queryKey: ['conversations'] })
            const prev = queryClient.getQueryData(['conversations'])
            queryClient.setQueryData(['conversations'], old => old?.filter(c => c._id !== convoId))
            return { prev }
        },
        onError: (err, convoId, ctx) => queryClient.setQueryData(['conversations'], ctx.prev),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })
}

/**
 * Hook for marking messages as read
 */
export const useMarkRead = (convoId) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => chatApi.patch(`/${convoId}/messages/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
    })
}
