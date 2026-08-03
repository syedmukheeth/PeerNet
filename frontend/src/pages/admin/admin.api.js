import api from '../../api/axios'

/*
 * Every network call the admin console makes, extracted verbatim from the
 * original Admin.jsx. The response shapes are NOT normalised here even though
 * they are inconsistent (data.data vs data.users vs data.posts vs data.reports
 * vs data.logs) - that inconsistency is pre-existing behaviour and changing it
 * is out of scope for a pure move.
 */

export const getStats = () => api.get('/admin/stats')
export const getAnalytics = () => api.get('/admin/analytics')
export const getUsers = (search = '') => api.get(`/admin/users?search=${search}`)
export const getPosts = (type = 'all') => api.get(`/admin/posts?type=${type}`)
export const getComments = (search = '') => api.get(`/admin/comments?search=${search}`)
export const getPendingReports = () => api.get('/admin/reports?status=pending')
export const getLogs = () => api.get('/admin/logs')

export const resolveReport = (reportId, status, resolution = '') =>
    api.patch(`/admin/reports/${reportId}`, { status, resolution })

export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`)
export const deletePost = (postId) => api.delete(`/admin/posts/${postId}`)
export const deleteComment = (commentId) => api.delete(`/admin/comments/${commentId}`)
export const toggleVerifyUser = (userId) => api.patch(`/admin/users/${userId}/verify`)

export const runSystemAction = (type, confirmationCode, adminPassword) =>
    api.delete('/admin/infrastructure/nuke', {
        data: { type, confirmationCode, adminPassword },
    })
