import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/axios'
import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// ZENITH SINGLETONS: These persist even when navigating away
const draftCache = {}
const scrollCache = {}

/*
 * Pin, mute and archive are client-side preferences: the API has no field for
 * them. They used to live in module-level Sets, so every toggle was silently
 * lost on reload and leaked between accounts on the same device, while the UI
 * presented them as saved settings.
 *
 * Persisted per user id in localStorage instead. Still local-only, but now it
 * behaves the way the controls claim to.
 */
const STATE_KEY = 'pn_convo_state'

const readState = (userId) => {
    if (!userId) return { pinned: [], muted: [], archived: [] }
    try {
        const all = JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
        const mine = all[userId] || {}
        return {
            pinned: mine.pinned || [],
            muted: mine.muted || [],
            archived: mine.archived || [],
        }
    } catch {
        return { pinned: [], muted: [], archived: [] }
    }
}

const writeState = (userId, next) => {
    if (!userId) return
    try {
        const all = JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
        all[userId] = next
        localStorage.setItem(STATE_KEY, JSON.stringify(all))
    } catch {
        // Storage can be full or blocked; the toggle simply does not persist.
    }
}

/**
 * Hook for managing conversations list
 */
export const useConvos = () => {
    const { user } = useAuth()
    const userId = user?._id

    return useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await chatApi.get('/')
            let data = res.data
            let list = []
            if (data?.data && Array.isArray(data.data)) list = data.data
            else if (data?.conversations && Array.isArray(data.conversations)) list = data.conversations
            else list = Array.isArray(data) ? data : []

            // Inject local state for Pin/Mute/Archive; the API has no such fields
            const state = readState(userId)
            return list.map(c => ({
                ...c,
                isPinned: state.pinned.includes(c._id),
                isMuted: state.muted.includes(c._id),
                isArchived: state.archived.includes(c._id)
            }))
        },
        enabled: !!userId,
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
        // `attachments` used to be passed here, but no endpoint has ever
        // accepted such a field; media goes through useSendMedia below, which
        // posts the multipart body the API actually expects.
        mutationFn: ({ text, replyToId }) =>
            chatApi.post(`/${convoId}/messages`, { body: text, replyTo: replyToId }),
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
 * Sends an image or video attachment.
 *
 * The attachment button in the composer used to toast "Uploading soon..." and
 * do nothing, even though the endpoint has always accepted a multipart body
 * through uploadMedia.single('media').
 */
export const useSendMedia = (convoId) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ file, text }) => {
            const form = new FormData()
            form.append('media', file)
            if (text) form.append('body', text)
            return chatApi.post(`/${convoId}/messages`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
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
 * These run as local-only state toggles, backend endpoints are not yet implemented.
 * When backend support is added, swap mutationFn back to an API call.
 */
export const useConvoActions = () => {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const userId = user?._id

    const toggleState = (type, id) => {
        const current = readState(userId)
        const list = current[type]
        current[type] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
        writeState(userId, current)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    // Local-only toggle, no API call, no error
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
