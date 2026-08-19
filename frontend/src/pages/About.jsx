import { Helmet } from 'react-helmet-async'
import logoImg from '../assets/logo.svg'

export default function About() {
    return (
        <div className="static-page">
            <Helmet>
                <title>About | PeerNet</title>
                <meta name="description" content="What PeerNet is and who builds it." />
            </Helmet>

            <header className="static-page__header">
                <img src={logoImg} alt="" className="static-page__logo" />
                <h1 className="static-page__title">About PeerNet</h1>
                <p className="static-page__lead">
                    A social app for sharing photos, short videos and messages.
                </p>
            </header>

            <section className="static-page__section">
                <h2>What it is</h2>
                <p>
                    PeerNet has a feed of posts from accounts you follow, 24-hour stories, vertical
                    short videos, and direct messages. You can follow accounts, like and comment on
                    posts, save posts to read later, and reply in threads.
                </p>
            </section>

            <section className="static-page__section">
                <h2>How your data is handled</h2>
                <p>
                    Accounts are password-protected and sessions use short-lived tokens. Uploads are
                    stored on Cloudinary; nothing is sold to advertisers. The{' '}
                    <a href="/legal/privacy">privacy policy</a> covers what is collected and why.
                </p>
            </section>

            <section className="static-page__section">
                <h2>Who builds it</h2>
                <p>
                    PeerNet is built and maintained by{' '}
                    <a href="https://www.linkedin.com/in/syedmukheeth" target="_blank" rel="noopener noreferrer">
                        Syed Mukheeth
                    </a>
                    . Found a bug or have a suggestion? Use the Report Bug link in the footer.
                </p>
            </section>
        </div>
    )
}
