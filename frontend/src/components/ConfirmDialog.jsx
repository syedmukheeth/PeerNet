import Modal from './ui/Modal'

/*
 * Destructive actions used window.confirm(), which is unstyled, ignores the
 * theme, cannot be dismissed with anything but its own buttons, and blocks the
 * main thread. Built on ui/Modal, so escape, the focus trap and the scroll lock
 * come for free.
 *
 * The admin console had a second copy of this speaking in a different voice
 * ("Terminate Asset?"). It is gone; the console uses this one, which is why
 * three props exist that the app's own call sites do not pass:
 *
 *   children        extra fields to collect before confirming (a warning
 *                   message, a password)
 *   busy            the request is in flight, so both buttons lock
 *   closeOnConfirm  false for async handlers that need to stay open and show
 *                   an error if the request fails. Default true, which is what
 *                   the sync call sites already relied on.
 */
export default function ConfirmDialog({
    title = 'Are you sure?',
    body,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    destructive = true,
    busy = false,
    confirmDisabled = false,
    closeOnConfirm = true,
    onConfirm,
    onClose,
    children,
}) {
    return (
        <Modal onClose={onClose} title={title} size="sm">
            <div className="confirm-dialog">
                {body && <p className="confirm-dialog-body">{body}</p>}
                {children}
                <div className="confirm-dialog-actions">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
                        disabled={busy || confirmDisabled}
                        aria-busy={busy || undefined}
                        onClick={() => { onConfirm?.(); if (closeOnConfirm) onClose?.() }}
                    >
                        {busy && <span className="spinner spinner-sm" aria-hidden="true" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
