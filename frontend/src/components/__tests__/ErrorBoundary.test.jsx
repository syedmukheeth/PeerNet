import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

// React logs the caught error to console.error itself, which would otherwise
// bury the real test output in stack traces.
let consoleError

beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    consoleError.mockRestore()
})

const Boom = ({ shouldThrow }) => {
    if (shouldThrow) throw new Error('kaboom')
    return <p>recovered</p>
}

describe('ErrorBoundary', () => {
    it('renders its children when nothing throws', () => {
        render(
            <ErrorBoundary>
                <p>all good</p>
            </ErrorBoundary>,
        )
        expect(screen.getByText('all good')).toBeInTheDocument()
    })

    it('catches a render throw instead of unmounting the tree', () => {
        render(
            <ErrorBoundary>
                <Boom shouldThrow />
            </ErrorBoundary>,
        )
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('recovers when the user retries', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <Boom shouldThrow />
            </ErrorBoundary>,
        )
        expect(screen.getByRole('alert')).toBeInTheDocument()

        rerender(
            <ErrorBoundary>
                <Boom shouldThrow={false} />
            </ErrorBoundary>,
        )
        fireEvent.click(screen.getByRole('button', { name: /try again/i }))

        expect(screen.getByText('recovered')).toBeInTheDocument()
    })

    it('clears the error when resetKey changes, so a failure is not sticky', () => {
        const { rerender } = render(
            <ErrorBoundary resetKey="/a">
                <Boom shouldThrow />
            </ErrorBoundary>,
        )
        expect(screen.getByRole('alert')).toBeInTheDocument()

        // Layout passes the pathname as resetKey, so this is what navigating
        // away from a broken page looks like.
        rerender(
            <ErrorBoundary resetKey="/b">
                <Boom shouldThrow={false} />
            </ErrorBoundary>,
        )

        expect(screen.getByText('recovered')).toBeInTheDocument()
    })
})
