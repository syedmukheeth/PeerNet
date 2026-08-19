/*
 * Who counts as staff.
 *
 * The backend has had one answer since middleware/admin.middleware.js was
 * written: requireAdmin accepts 'admin' and 'superadmin', requireSuperAdmin
 * accepts only the second. The frontend had five answers. App.jsx and
 * PostCard.jsx checked both roles; DesktopSidebar and MobileHeader compared
 * against 'admin' with ===, so promoting an account to superadmin, which is
 * the only way to reach the password-reset and infrastructure routes, removed
 * the Admin Console link from that account's own navigation.
 *
 * One definition, imported by all of them.
 */

export const isAdmin = (user) => user?.role === 'admin' || user?.role === 'superadmin'

export const isSuperAdmin = (user) => user?.role === 'superadmin'
