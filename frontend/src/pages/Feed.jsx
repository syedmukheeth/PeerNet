import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import PostCard from '../components/PostCard'
import StoryRail from '../components/StoryRail'

const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
}

export default function Feed() {
    const [posts, setPosts] = useState([])
    const [cursor, setCursor] = useState(null)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)

    const fetchFeed = useCallback(async (cur = null) => {
        if (loading) return
        setLoading(true)
        try {
            const params = { limit: 10 }
            if (cur) params.cursor = cur
            const { data } = await api.get('/posts/feed', { params })
            setPosts(p => cur ? [...p, ...data.data] : data.data)
            setCursor(data.nextCursor)
            setHasMore(data.hasMore)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }, [loading])

    useEffect(() => { fetchFeed() }, []) // eslint-disable-line

    const onLikeToggle = (postId, liked, likesCount) => {
        setPosts(p => p.map(post => post._id === postId ? { ...post, isLiked: liked, likesCount } : post))
    }

    const onDelete = (postId) => setPosts(p => p.filter(post => post._id !== postId))

    const onUpdate = (postId, updated) => {
        setPosts(p => p.map(post => post._id === postId ? { ...post, ...updated } : post))
    }

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate">
            <StoryRail />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                {posts.map(post => (
                    <PostCard key={post._id} post={post}
                        onLikeToggle={onLikeToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                    />
                ))}
            </div>

            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div className="spinner" />
                </div>
            )}

            {!loading && posts.length === 0 && (
                <div className="empty-state" style={{ marginTop: 40 }}>
                    <div className="empty-state-icon">👥</div>
                    <p className="empty-state-title">Your feed is empty</p>
                    <p className="empty-state-desc">Follow people to see their posts here</p>
                </div>
            )}

            {hasMore && !loading && posts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                    <motion.button className="btn btn-secondary"
                        onClick={() => fetchFeed(cursor)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}>
                        Load more
                    </motion.button>
                </div>
            )}
        </motion.div>
    )
}
