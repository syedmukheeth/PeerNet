'use strict';

const Notification = require('./Notification');
const Post = require('../post/Post');
const Comment = require('../comment/Comment');
const Message = require('../chat/Message');
const User = require('../user/User');
const Follower = require('../user/Follower');
const { getRedisOptional } = require('../../config/redis');
const logger = require('../../config/logger');

/**
 * The "Absolute Truth" Formatter
 * Standardizes notifications, extracts thumbnails, and calculates precise navigation URLs.
 */
const formatNotification = (notif, hydratedEntity = null) => {
    // 1. Convert to plain object
    const obj = notif.toObject ? notif.toObject({ virtuals: true, getters: true }) : { ...notif };
    
    // 2. Resolve the target entity (use the passed hydrate or the existing populated one)
    const e = hydratedEntity || obj.entityId;
    
    let thumbnail = null;
    let targetUrl = '/';
    let targetId = null;
    const type = obj.type;

    // The thumbnail's media kind travels with it. It was fetched and then
    // dropped, so the client had no way to tell a video from an image and put
    // video URLs into <img src>, and no way to render a text post at all.
    let thumbnailType = null;
    let thumbnailBackground = null;
    let thumbnailText = null;

    if (e) {
        // High-fidelity extraction logic
        const getMedia = (target) => (target ? target.mediaUrl || null : null);

        const describeMedia = (target) => {
            if (!target) return;
            thumbnailType = target.mediaType || null;
            // A text post has no mediaUrl at all, so the client needs its
            // ground and its words to draw the tile the way the feed does.
            if (target.mediaType === 'text') {
                thumbnailBackground = target.backgroundColor || null;
                thumbnailText = target.caption || null;
            }
        };

        if (obj.entityModel === 'Post') {
            if (!e) {
                thumbnail = null;
                targetId = obj.entityId?.toString();
                targetUrl = `/posts/${targetId}`;
            } else {
                thumbnail = getMedia(e);
                describeMedia(e);
                targetId = e._id?.toString() || e.toString();
                targetUrl = `/posts/${targetId}`;
            }
        } else if (obj.entityModel === 'Comment') {
            // Reach through: use the populated parent post
            const parent = (e && e.post && typeof e.post === 'object') ? e.post : null;
            if (parent) {
                thumbnail = getMedia(parent);
                describeMedia(parent);
                targetId = parent._id?.toString();
            }
            
        // Build navigation URL: always go to the parent post and pass the commentId
        if (targetId) {
            const parentId = (e && e.parentComment) ? (e.parentComment._id || e.parentComment).toString() : null;
            targetUrl = `/posts/${targetId}?commentId=${obj.entityId}${parentId ? `&parentId=${parentId}` : ''}`;
        } else {
            // Fallback: use raw ObjectId stored in e.post if e exists but parent isn't hydrated
            const rawParentId = e ? e.post?.toString() : null;
            targetUrl = rawParentId ? `/posts/${rawParentId}?commentId=${obj.entityId}` : '/';
        }
        } else if (obj.entityModel === 'Message') {
            // A reacted-to direct message. There is no thumbnail to show - the
            // conversation is private and a preview does not belong in a
            // notification list - so this only needs to lead back to the thread.
            targetId = (e.conversation?._id || e.conversation)?.toString() || null;
            targetUrl = targetId ? `/messages/${targetId}` : '/messages';
        }
    }

    // Standardize sender
    const sender = obj.sender && typeof obj.sender === 'object' ? {
        _id: obj.sender._id?.toString() || obj.sender.toString(),
        username: obj.sender.username,
        avatarUrl: obj.sender.avatarUrl,
        isVerified: obj.sender.isVerified
    } : null;

    // PRODUCTION TRACER: Log generated thumbnail
    // For comment/reply, surface the comment body for frontend preview
    let commentBody = null;
    if ((type === 'comment' || type === 'reply') && e) {
        commentBody = e.body || null;
    }

    return {
        ...obj,
        _id: obj._id.toString(),
        thumbnail,
        thumbnailType,
        thumbnailBackground,
        thumbnailText,
        targetUrl,
        targetId: targetId || (e?._id?.toString() || e?.toString()),
        sender,
        // Attach entity details needed by frontend
        entityId: e ? {
            _id: e._id?.toString(),
            body: e.body || null,
            post: e.post?._id?.toString() || e.post?.toString() || null,
            parentComment: e.parentComment?._id?.toString() || e.parentComment?.toString() || null,
        } : obj.entityId,
        commentBody,
    };
};

const createNotification = async (data) => {
    try {
        // 1. DEDUPLICATION: Avoid spamming identical notifications within 5 seconds for likes (rapid testing)
        // Others can keep 60s window.
        const windowDuration = data.type === 'like' ? 5000 : 60000;
        const duplicateWindow = new Date(Date.now() - windowDuration);
        const existing = await Notification.findOne({
            recipient: data.recipient,
            sender: data.sender,
            type: data.type,
            entityId: data.entityId,
            createdAt: { $gt: duplicateWindow }
        }).sort({ createdAt: -1 });

        if (existing) {
            // Already sent recently, just ignore or bump the timestamp if desired.
            // For now, we return null to signal "no new broadcast needed".
            return null;
        }

        const notification = await Notification.create(data);

        // Manual Hydration for single creation
        let hydratedEntity = null;
        if (data.entityModel === 'Post') hydratedEntity = await Post.findById(data.entityId).lean();
        else if (data.entityModel === 'Comment') hydratedEntity = await Comment.findById(data.entityId)
            .populate({ path: 'post', strictPopulate: false })
            .lean();
        // A reacted-to message only needs to know which thread it is in, so the
        // notification can link back to it. Its body stays out of this.
        else if (data.entityModel === 'Message') hydratedEntity = await Message
            .findById(data.entityId).select('conversation').lean();

        const sender = await User.findById(data.sender).select('username avatarUrl isVerified').lean();
        
        // Convert to plain object to ensure we can attach the populated sender safely for broadcasting
        const notificationObj = notification.toObject();
        notificationObj.sender = sender;

        const formatted = formatNotification(notificationObj, hydratedEntity);

        // The list path attaches this; the live path did not, so a follow
        // arriving over the socket always rendered a "Follow" button even when
        // the recipient already followed that person back.
        if (formatted.sender) {
            const followsBack = await Follower.exists({
                follower: data.recipient,
                following: data.sender
            });
            formatted.sender.isFollowing = Boolean(followsBack);
        }

        // Broadcast to Redis for real-time delivery
        const redis = getRedisOptional();
        if (redis) {
            await redis.publish('peernet:notifications', JSON.stringify({
                recipient: data.recipient.toString(),
                type: 'new_notification',
                notification: formatted
            }));
        }

        return formatted;
    } catch (err) {
        // Same reasoning as removeNotification: never break the request, but
        // never lose the reason either.
        logger.error(`Failed to create notification: ${err.message}`, err);
        return null;
    }
};

/**
 * Deletes every notification matching the filter.
 *
 * Deletes all matches rather than the first one findOne happens to return:
 * callers frequently omit `recipient`, and with an arbitrary pick that meant
 * unliking your own post could delete a different user's notification for the
 * same post. Callers should still pass the narrowest filter they can.
 */
const removeNotification = async (filter) => {
    try {
        const notifications = await Notification.find(filter).select('_id recipient').lean();
        if (notifications.length === 0) return;

        await Notification.deleteMany({ _id: { $in: notifications.map((n) => n._id) } });

        const redis = getRedisOptional();
        if (redis) {
            await Promise.all(notifications.map((n) =>
                redis.publish('peernet:notifications', JSON.stringify({
                    recipient: n.recipient.toString(),
                    type: 'notification_removed',
                    notificationId: n._id.toString()
                }))
            ));
        }
    } catch (err) {
        // Notification removal must not break the request flow, but swallowing
        // it silently made every lost notification undiagnosable.
        logger.error(`Failed to remove notification: ${err.message}`, err);
    }
};

/**
 * The "BULK HYDRATION" Engine (Refined)
 * Grouped FETCH + Manual STITCH to bypass Mongoose populate instability.
 */
const getNotifications = async (userId, { limit = 20, cursor = null }) => {
    const query = { recipient: userId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    // Stage 1: Raw fetch
    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('sender', 'username avatarUrl isVerified');

    const rawResults = notifications.slice(0, limit);
    const hasMore = notifications.length > limit;

    // Stage 2: Entity ID collection
    const grouped = { Post: [], Comment: [], Message: [] };
    rawResults.forEach(n => {
        if (n.entityId && n.entityModel && grouped[n.entityModel]) {
            grouped[n.entityModel].push(n.entityId);
        }
    });

    // Stage 3: Bulk Manual Hydration
    // For comments, also eagerly load the parent post so thumbnail can be extracted
    const [posts, comments, dmMessages] = await Promise.all([
        Post.find({ _id: { $in: grouped.Post } }).lean(),
        Comment.find({ _id: { $in: grouped.Comment } })
            .populate({ path: 'post', select: 'mediaUrl mediaType author backgroundColor caption', strictPopulate: false })
            .lean(),
        // Only the conversation id: a reaction notification links back to the
        // thread and never quotes what was said in it.
        Message.find({ _id: { $in: grouped.Message } }).select('conversation').lean()
    ]);

    // Helper to check if a field is an unpopulated ObjectId
    const isUnpopulated = (val) => val && (!val._id || typeof val.author === 'undefined');

    const commentPostIds = [];
    comments.forEach(c => {
        if (isUnpopulated(c.post)) commentPostIds.push(c.post.toString());
    });

    const extraPosts = commentPostIds.length > 0
        ? await Post.find({ _id: { $in: commentPostIds } })
            .select('mediaUrl mediaType author backgroundColor caption').lean()
        : [];

    const extraPostsMap = new Map(extraPosts.map(p => [p._id.toString(), p]));

    // Patch comments: replace bare ObjectId with the fetched document
    comments.forEach(c => {
        if (isUnpopulated(c.post)) {
            c.post = extraPostsMap.get(c.post.toString()) || c.post;
        }
    });

    // Lookup table
    const entitiesMap = new Map();
    posts.forEach(p => entitiesMap.set(p._id.toString(), p));
    comments.forEach(c => entitiesMap.set(c._id.toString(), c));
    dmMessages.forEach(m => entitiesMap.set(m._id.toString(), m));

    // Stage 4: Formatted Stitching
    const formattedResults = rawResults.map(n => {
        const hydrated = entitiesMap.get(n.entityId?.toString());
        return formatNotification(n, hydrated);
    });

    // Stage 4.5: Attach Following Status to Senders
    const senderIds = [...new Set(formattedResults.map(n => n.sender?._id).filter(Boolean))];
    if (senderIds.length > 0) {
        const relations = await Follower.find({
            follower: userId,
            following: { $in: senderIds }
        }).select('following');
        const followingSet = new Set(relations.map(r => r.following.toString()));
        
        formattedResults.forEach(n => {
            if (n.sender) {
                n.sender.isFollowing = followingSet.has(n.sender._id.toString());
            }
        });
    }

    // Stage 5: Self-Healing Garbage Collector
    const validResults = [];
    const ghosts = [];

    formattedResults.forEach(n => {
        // GHOST DETECTION: A notification is a ghost only if its target entity (Post/Comment)
        // was once there (entityId exists) but is no longer in our database (hydrated entity missing).
        const hasEntity = n.entityId;
        const entityIdStr = (n.entityId && typeof n.entityId === 'object' && n.entityId._id) 
            ? n.entityId._id.toString() 
            : n.entityId?.toString();
        const entityFound = entityIdStr && entitiesMap.has(entityIdStr);
        
        const isGhost = hasEntity && !entityFound && (n.type === 'like' || n.type === 'comment' || n.type === 'reply');
        
        if (isGhost) {
            ghosts.push(n._id);
        } else {
            validResults.push(n);
        }
    });

    if (ghosts.length > 0) {
        // Fire-and-forget background cleanup
        Notification.deleteMany({ _id: { $in: ghosts } }).catch(() => {});
    }

    const nextCursor = hasMore ? rawResults[rawResults.length - 1].createdAt.toISOString() : null;
    return { data: groupNotifications(validResults), nextCursor, hasMore };
};

// Types where one row per event is noise: many people doing the same small
// thing to the same object. Comments and replies each carry their own text and
// merging them would throw it away; follows and warnings are singular by
// nature.
const GROUPABLE_TYPES = new Set(['like', 'reaction']);

// How many distinct emoji a grouped reaction row shows before it stops
// collecting. Past three the row is describing a pile, not a set.
const MAX_GROUPED_EMOJI = 3;

/**
 * Collapse repeated events on the same entity into one row.
 *
 * A post that does well used to produce one row per liker, so the list became
 * a wall of near-identical lines and everything else on it was pushed out of
 * reach. This is the "alice and 12 others liked your post" behaviour, and it
 * covers message reactions for the same reason: a thread where several people
 * react to one message produced one row each.
 *
 * A grouped reaction keeps the distinct emoji rather than the last one to
 * arrive, so the row can still say what people reacted with.
 *
 * The grouping is not a $group stage in the pipeline above because that
 * pipeline hydrates entities, reaches from a comment through to its parent post
 * for the thumbnail, attaches follow state and garbage-collects notifications
 * whose target no longer exists. Grouping the formatted output keeps all of
 * that intact.
 *
 * Grouping is within a page. Events on one entity cluster in time and the page
 * is ordered by createdAt, so they land together in practice; a run that
 * straddles a page boundary yields two groups rather than a wrong one.
 */
const groupNotifications = (rows) => {
    const out = [];
    const groupsByKey = new Map();

    rows.forEach((row) => {
        /*
         * The entity, not the navigation target. targetId is where the row
         * links to, which for a message reaction is the whole conversation and
         * for a comment like is the parent post - so keying on it merged
         * reactions on two different messages in one thread, and likes on two
         * different comments under one post, into a single row.
         */
        const entityKey = row.entityId?._id || row.entityId || row.targetId;
        if (!GROUPABLE_TYPES.has(row.type) || !entityKey) {
            out.push(row);
            return;
        }

        // The type is part of the key: a like and a reaction on the same
        // object are different events and must not merge.
        const key = `${row.type}:${row.entityModel || 'Post'}:${entityKey}`;
        const existing = groupsByKey.get(key);

        if (!existing) {
            const group = {
                ...row,
                senders: row.sender ? [row.sender] : [],
                count: 1,
                emojis: row.type === 'reaction' && row.message ? [row.message] : undefined,
            };
            groupsByKey.set(key, group);
            out.push(group);
            return;
        }

        // The same person acting twice cannot inflate the count.
        const alreadyCounted = existing.senders.some(
            (s) => s && row.sender && s._id === row.sender._id
        );
        if (!alreadyCounted && row.sender) {
            // Only the first few are ever shown as avatars, but the count is
            // the true total.
            if (existing.senders.length < 3) existing.senders.push(row.sender);
            existing.count += 1;
        }

        if (existing.emojis && row.message && !existing.emojis.includes(row.message)
            && existing.emojis.length < MAX_GROUPED_EMOJI) {
            existing.emojis.push(row.message);
        }

        // A group is unread if any notification in it is.
        if (!row.isRead) existing.isRead = false;
    });

    // The row reads `message` for the emoji, so a group publishes its whole set
    // through the same field rather than the client learning a second one.
    out.forEach((row) => {
        if (row.emojis?.length) row.message = row.emojis.join('');
        // Internal accumulator; the client reads `message`.
        delete row.emojis;
    });

    return out;
};

const markAllRead = async (userId) => {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

    // Broadcast sync event so all client sessions refresh their unread counts
    const redis = getRedisOptional();
    if (redis) {
        await redis.publish('peernet:notifications', JSON.stringify({
            recipient: userId.toString(),
            type: 'NOTIFICATION_COUNT_SYNC'
        }));
    }
};

const getUnreadCount = async (userId) =>
    Notification.countDocuments({ recipient: userId, isRead: false });

module.exports = { createNotification, removeNotification, getNotifications, markAllRead, getUnreadCount };
