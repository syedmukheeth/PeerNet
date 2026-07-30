import { Helmet } from 'react-helmet-async'

export default function Terms() {
    return (
        <div className="static-page">
            <Helmet>
                <title>Terms of Service | PeerNet</title>
            </Helmet>

            <header className="static-page__header static-page__header--left">
                <h1 className="static-page__title">Terms of Service</h1>
                <p className="static-page__meta">Last updated: July 30, 2026</p>
            </header>

            <section className="static-page__section">
                <h2>Using PeerNet</h2>
                <p>
                    Creating an account means you accept these terms. You need to be old enough to
                    consent to an online service where you live. You are responsible for keeping your
                    password safe and for everything posted from your account.
                </p>
            </section>

            <section className="static-page__section">
                <h2>What you may not post</h2>
                <p>
                    No illegal content, harassment, threats, hate speech, sexual content involving
                    minors, spam, malware, or impersonation of other people. We remove content and
                    suspend or delete accounts that break these rules, at our discretion and without
                    prior notice.
                </p>
            </section>

            <section className="static-page__section">
                <h2>Your content</h2>
                <p>
                    You keep the rights to everything you post. By posting you give us permission to
                    store, copy and display it as needed to run the service. Deleting a post removes it
                    from the app; cached copies at our image host may persist for a short period
                    afterwards.
                </p>
            </section>

            <section className="static-page__section">
                <h2>No warranty</h2>
                <p>
                    PeerNet is provided as-is, with no guarantee of uptime and no guarantee that your
                    data will not be lost. Keep your own copies of anything you care about. Features may
                    change or be removed. To the extent the law allows, we are not liable for losses
                    arising from your use of the service or from content other users post.
                </p>
            </section>

            <section className="static-page__section">
                <h2>Changes</h2>
                <p>
                    These terms can change. The date above shows the last revision; continuing to use
                    PeerNet after a change means you accept the updated terms.
                </p>
            </section>
        </div>
    )
}
