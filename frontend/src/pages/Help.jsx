import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import FeedbackModal from '../components/FeedbackModal'

const faqs = [
    {
        q: 'How do I post a story?',
        a: 'Tap your avatar at the start of the story rail on the home feed, then pick a photo or write a text story. Stories disappear after 24 hours.',
    },
    {
        q: 'Can I post a video?',
        a: 'Yes. Choose a video when you create a post and it appears in the feed like any other post, with a film marker on your profile grid.',
    },
    {
        q: 'Who can see my posts?',
        a: 'Posts are visible to anyone with a link to them. Saved posts are private to you. Direct messages are only visible to the people in the conversation.',
    },
    {
        q: 'How do I change my display name or avatar?',
        a: 'Open your profile and choose Edit Profile. Name, bio, website and avatar can all be changed there.',
    },
    {
        q: 'How do I switch between accounts?',
        a: 'Open More in the sidebar (or the menu on mobile) and choose Switch account. Accounts you have signed into on this device are listed there.',
    },
    {
        q: 'How do I delete a post?',
        a: 'Open the post, use the menu in the top-right of the post card, and choose Delete. This cannot be undone.',
    },
]

export default function Help() {
    const [showFeedback, setShowFeedback] = useState(false)

    return (
        <div className="static-page">
            <Helmet>
                <title>Help | PeerNet</title>
            </Helmet>

            <header className="static-page__header">
                <h1 className="static-page__title">Help</h1>
                <p className="static-page__lead">Answers to the questions that come up most often.</p>
            </header>

            <section className="static-page__section">
                <dl className="faq-list">
                    {faqs.map((faq) => (
                        <div key={faq.q} className="faq-item">
                            <dt className="faq-item__q">{faq.q}</dt>
                            <dd className="faq-item__a">{faq.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="static-page__section">
                <h2>Still stuck?</h2>
                <p>
                    Report the problem and it goes straight to the maintainer, along with the page you
                    were on.
                </p>
                <button className="btn btn-primary" onClick={() => setShowFeedback(true)}>
                    Report a problem
                </button>
            </section>

            {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
        </div>
    )
}
