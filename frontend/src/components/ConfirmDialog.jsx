import Modal from './ui/Modal'

/*
 * Destructive actions used window.confirm(), which is unstyled, ignores the
 * theme, cannot be dismissed with anything but its own buttons, and blocks the
 * main thread. admin/ConfirmDeleteModal exists but speaks in the admin
 * console's voice ("Terminate Asset"), so this is the equivalent for the app
 * itself. Built on ui/Modal, so escape, the focus trap and the scroll lock come
 * for free.
 */
export default function ConfirmDialog({
    title = 'Are you sure?',
    body,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    destructive = true,
    onConfirm,
    onClose,
}) {
    return (
        <Modal onClose={onClose} title={title} size="sm">
            <div className="confirm-dialog">
                {body && <p className="confirm-dialog-body">{body}</p>}
                <div className="confirm-dialog-actions">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
                        onClick={() => { onConfirm?.(); onClose?.() }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
