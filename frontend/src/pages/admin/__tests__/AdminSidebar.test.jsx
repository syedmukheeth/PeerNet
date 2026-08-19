import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AdminSidebar from '../AdminSidebar'

const renderSidebar = (props = {}) =>
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <AdminSidebar counts={{ reports: 0 }} isOpen={false} user={{ role: 'admin' }} {...props} />
        </MemoryRouter>,
    )

describe('AdminSidebar', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    /*
     * The collapse control used to carry `ac-collapse-hide`, which is the class
     * the collapsed rail hides. Collapsing therefore removed the only control
     * that expands it again, and the sidebar was stuck as a strip of unlabelled
     * icons until localStorage was cleared by hand.
     */
    it('keeps the expand control reachable after collapsing', () => {
        renderSidebar()

        const collapse = screen.getByRole('button', { name: /collapse navigation/i })
        expect(collapse).toHaveAttribute('aria-expanded', 'true')

        fireEvent.click(collapse)

        const expand = screen.getByRole('button', { name: /expand navigation/i })
        expect(expand).toBeInTheDocument()
        expect(expand.className).not.toMatch(/ac-collapse-hide/)
        expect(expand).toHaveAttribute('aria-expanded', 'false')

        fireEvent.click(expand)
        expect(screen.getByRole('button', { name: /collapse navigation/i })).toBeInTheDocument()
    })

    it('remembers the collapsed state across mounts', () => {
        const { unmount } = renderSidebar()
        fireEvent.click(screen.getByRole('button', { name: /collapse navigation/i }))
        unmount()

        renderSidebar()
        expect(screen.getByRole('button', { name: /expand navigation/i })).toBeInTheDocument()
    })

    /* The mark is inline SVG, not an <img>. Loaded through <img> it is an
       isolated document and cannot read currentColor or --accent, so it could
       not follow the theme. */
    it('draws the mark inline so it can inherit the theme', () => {
        renderSidebar()
        const svg = document.querySelector('.ac-brand svg')
        expect(svg).toBeTruthy()
        expect(document.querySelector('.ac-brand img')).toBeNull()
        expect(svg.querySelector('[fill="var(--accent)"]')).toBeTruthy()
    })

    it('hides the superadmin-only settings link from a plain admin', () => {
        renderSidebar()
        expect(screen.queryByRole('link', { name: /settings/i })).toBeNull()

        renderSidebar({ user: { role: 'superadmin' } })
        expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0)
    })

    it('badges the reports link with the pending count', () => {
        renderSidebar({ counts: { reports: 3 } })
        const reports = screen.getByRole('link', { name: /reports/i })
        expect(within(reports).getByText('3')).toBeInTheDocument()
    })
})
