import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import ConfirmDialog from '../ConfirmDialog'

// framer-motion's animation loop is irrelevant here and slows the suite down.
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion')
    return { ...actual, useReducedMotion: () => true }
})

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('ConfirmDialog accessibility', () => {
    it('exposes the dialog role and is named by its title', () => {
        renderWithRouter(
            <ConfirmDialog title="Delete this post?" body="Cannot be undone." onClose={() => {}} />,
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAccessibleName('Delete this post?')
    })

    it('closes on Escape', () => {
        const onClose = vi.fn()
        renderWithRouter(<ConfirmDialog title="Delete?" onClose={onClose} />)

        // ui/Modal listens on document, which is what makes Escape work for
        // every modal built on it.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        expect(onClose).toHaveBeenCalled()
    })

    it('locks background scroll while open and restores it on close', () => {
        const { unmount } = renderWithRouter(<ConfirmDialog title="Delete?" onClose={() => {}} />)
        expect(document.body.style.overflow).toBe('hidden')
        unmount()
        expect(document.body.style.overflow).not.toBe('hidden')
    })

    it('gives both actions accessible names', () => {
        renderWithRouter(
            <ConfirmDialog title="Delete?" confirmLabel="Delete" onClose={() => {}} onConfirm={() => {}} />,
        )
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
})
