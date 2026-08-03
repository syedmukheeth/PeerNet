import { useId } from 'react'
import cx from './cx'

export default function Input({
    label,
    error,
    hint,
    leftIcon,
    className,
    id,
    ...rest
}) {
    const autoId = useId()
    const inputId = id || autoId
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

    return (
        <div className="input-group">
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                </label>
            )}
            <div className={cx('input-wrap', leftIcon && 'input-wrap-icon')}>
                {leftIcon}
                <input
                    id={inputId}
                    className={cx('input', error && 'input-error', className)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    {...rest}
                />
            </div>
            {error && (
                <p id={`${inputId}-error`} className="input-message input-message-error" role="alert">
                    {error}
                </p>
            )}
            {!error && hint && (
                <p id={`${inputId}-hint`} className="input-message">
                    {hint}
                </p>
            )}
        </div>
    )
}
