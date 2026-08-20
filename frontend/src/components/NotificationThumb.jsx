import { Icon } from './ui/icons'
import { optimizeCloudinaryUrl, videoPosterUrl } from '../utils/cloudinary'
import { readableTextOn } from '../utils/contrast'

/*
 * The 44px tile at the end of a notification row, showing which post the event
 * happened on.
 *
 * It used to be a bare <img src={n.thumbnail}>, which failed on two of the
 * three post kinds. A video's thumbnail was its mp4 URL, and a browser will not
 * decode that as an image, so those tiles were permanently broken. A text post
 * has no mediaUrl at all, so it fell through to a generic icon and the row gave
 * no clue which post it meant. The server now sends the media kind alongside
 * the URL, so each kind can be drawn properly.
 */
export default function NotificationThumb({ notification }) {
    const { thumbnail, thumbnailType, thumbnailBackground, thumbnailText } = notification

    if (thumbnailType === 'text') {
        const background = thumbnailBackground || 'var(--accent-2)'
        return (
            <div
                className="notif-thumbnail-wrap notif-thumbnail-text"
                style={{ background, color: readableTextOn(thumbnailBackground) }}
                aria-hidden="true"
            >
                <span>{thumbnailText || 'Aa'}</span>
            </div>
        )
    }

    if (!thumbnail) return null

    if (thumbnailType === 'video') {
        const poster = videoPosterUrl(thumbnail, 120)
        return (
            <div className="notif-thumbnail-wrap">
                {poster && <img src={poster} alt="" className="notif-thumbnail" loading="lazy" />}
                <span className="notif-thumbnail-badge" aria-hidden="true">
                    <Icon name="play" size={11} solid />
                </span>
            </div>
        )
    }

    return (
        <div className="notif-thumbnail-wrap">
            <img
                src={optimizeCloudinaryUrl(thumbnail, 120)}
                alt=""
                className="notif-thumbnail"
                loading="lazy"
            />
        </div>
    )
}
