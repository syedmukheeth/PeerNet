import { Link } from 'react-router'
import { Helmet } from 'react-helmet-async'

/*
 * Unknown URLs used to redirect to "/", which silently swallowed typos and,
 * worse, made a shared link to a deleted or mistyped post look like the feed
 * had loaded normally.
 */
export default function NotFound() {
    return (
        <div className="not-found">
            <Helmet>
                <title>Page not found · PeerNet</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <p className="not-found-code">404</p>
            <h1 className="not-found-title">We could not find that page</h1>
            <p className="not-found-body">
                The link may be broken, or the post may have been deleted.
            </p>
            <Link to="/" className="btn btn-primary">Back to the feed</Link>
        </div>
    )
}
