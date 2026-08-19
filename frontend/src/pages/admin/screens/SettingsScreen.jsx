import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../../../components/ui/Button'
import * as adminApi from '../admin.api'
import ConfirmDialog from '../../../components/ConfirmDialog'

/*
 * This panel used to live on a tab id with no entry in the nav, so the two
 * most destructive controls in the product were unreachable from the UI while
 * their endpoint stayed live. It is now a real route, and the route is guarded
 * on isSuperAdmin the same way the endpoint is.
 */
const ACTIONS = [
    {
        type: 'users',
        label: 'Delete all user accounts',
        description: 'Removes every account except yours, and everything each one owns.'
    },
    {
        type: 'content',
        label: 'Delete all content',
        description: 'Removes every post, story and comment. Accounts survive.'
    },
    {
        type: 'full',
        label: 'Reset the platform',
        description: 'Both of the above. The database is left empty apart from your account.'
    }
]

export default function SettingsScreen() {
    const [pending, setPending] = useState(null)
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)

    const close = () => {
        setPending(null)
        setCode('')
        setPassword('')
    }

    const execute = async () => {
        setBusy(true)
        try {
            const { data } = await adminApi.runSystemAction(pending.type, code, password)
            if (data.success) {
                toast.success('Executed')
                close()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authorization failed')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="ac-stack">
            <section className="ac-panel">
                <div className="ac-panel-head">
                    <div>
                        <div className="ac-panel-title">Environment</div>
                        <div className="ac-panel-sub">Read only</div>
                    </div>
                </div>
                <div className="ac-panel-body">
                    <div className="ac-rows">
                        <div className="ac-row">
                            <span className="ac-row-label">Mode</span>
                            <span className="ac-row-value">
                                {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
                            </span>
                        </div>
                        <div className="ac-row">
                            <span className="ac-row-label">API</span>
                            <span className="ac-row-value ac-mono">
                                {import.meta.env.VITE_API_URL || 'same origin'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="ac-panel">
                <div className="ac-panel-head">
                    <div>
                        <div className="ac-panel-title">Destructive actions</div>
                        <div className="ac-panel-sub">
                            Irreversible. Each one is recorded in the activity log with your name on it.
                        </div>
                    </div>
                </div>
                <div className="ac-panel-body">
                    <div className="ac-rows">
                        {ACTIONS.map(action => (
                            <div key={action.type} className="ac-row">
                                <span>
                                    <span className="ac-row-label">{action.label}</span>
                                    <span className="ac-metric-sub" style={{ display: 'block' }}>
                                        {action.description}
                                    </span>
                                </span>
                                <Button size="sm" variant="danger" onClick={() => setPending(action)}>
                                    Run
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {pending && (
                <ConfirmDialog
                    title={pending.label}
                    body={`${pending.description} This cannot be undone. Type DELETE and confirm with your password.`}
                    confirmLabel="Execute"
                    destructive
                    busy={busy}
                    closeOnConfirm={false}
                    confirmDisabled={code !== 'DELETE' || !password}
                    onClose={close}
                    onConfirm={execute}
                >
                    <input
                        className="input"
                        placeholder="Type DELETE"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        autoComplete="off"
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Your admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </ConfirmDialog>
            )}
        </div>
    )
}
