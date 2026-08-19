import api from '../../api/axios'

/*
 * Every network call the admin console makes. The response shapes are NOT
 * normalised here even though they are inconsistent (data.data vs data.users
 * vs data.posts vs data.reports vs data.logs) - that inconsistency is
 * pre-existing on the API side and changing it belongs to the backend.
 */

export const getStats = () => api.get('/admin/stats')
export const getAnalytics = () => api.get('/admin/analytics')
export const getUsers = (search = '') => api.get(`/admin/users?search=${encodeURIComponent(search)}`)
export const getPosts = (type = 'all') => api.get(`/admin/posts?type=${encodeURIComponent(type)}`)
export const getComments = (search = '') => api.get(`/admin/comments?search=${encodeURIComponent(search)}`)
export const getPendingReports = () => api.get('/admin/reports?status=pending')
export const getLogs = () => api.get('/admin/logs')

export const resolveReport = (reportId, status, resolution = '') =>
    api.patch(`/admin/reports/${reportId}`, { status, resolution })

export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`)
export const deletePost = (postId) => api.delete(`/admin/posts/${postId}`)
export const deleteComment = (commentId) => api.delete(`/admin/comments/${commentId}`)
export const toggleVerifyUser = (userId) => api.patch(`/admin/users/${userId}/verify`)

/* Moderation actions the API has always exposed but no screen ever called.
   status is one of 'active' | 'suspended' | 'banned' (User.js:43). */
export const setUserStatus = (userId, status, reason = '') =>
    api.patch(`/admin/users/${userId}/status`, { status, reason })

export const warnUser = (userId, message) =>
    api.post(`/admin/users/${userId}/warn`, { message })

export const setPostVisibility = (postId, isHidden, reason = '') =>
    api.patch(`/admin/posts/${postId}/visibility`, { isHidden, reason })

export const runSystemAction = (type, confirmationCode, adminPassword) =>
    api.delete('/admin/infrastructure/nuke', {
        data: { type, confirmationCode, adminPassword },
    })
