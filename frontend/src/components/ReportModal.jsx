import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import Modal from './ui/Modal'

/*
 * The Report control in the post menu used to call toast.success('Reported')
 * and no API, so nothing was ever filed and the admin moderation queue stayed
 * permanently empty. This posts to /reports, which the backend now exposes.
 */

const REASONS = [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'violence', label: 'Violence or dangerous content' },
    { value: 'other', label: 'Something else' },
]

export default function ReportModal({ targetType, targetId, onClose }) {
    const [reason, setReason] = useState('spam')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)
        try {
            await api.post('/reports', { targetType, targetId, reason, description })
            toast.success('Report submitted. Our moderators will review it.')
            onClose?.()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not submit the report')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal onClose={onClose} title="Report this post" size="sm">
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
                    <legend className="text-sm font-semibold mb-2">Why are you reporting this?</legend>
                    {REASONS.map((r) => (
                        <label key={r.value} className="report-reason">
                            <input
                                type="radio"
                                name="reason"
                                value={r.value}
                                checked={reason === r.value}
                                onChange={() => setReason(r.value)}
                            />
                            <span>{r.label}</span>
                        </label>
                    ))}
                </fieldset>

                <div className="flex flex-col gap-1">
                    <label htmlFor="report-description" className="text-sm font-semibold">
                        Anything else we should know? <span className="text-muted font-normal">(optional)</span>
                    </label>
                    <textarea
                        id="report-description"
                        className="report-description"
                        rows={3}
                        maxLength={1000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add any detail that would help a moderator"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Submit report'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
