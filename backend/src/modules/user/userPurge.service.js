'use strict';

const User = require('./User');
const Follower = require('./Follower');
const Post = require('../post/Post');
const Like = require('../post/Like');
const SavedPost = require('../post/SavedPost');
const Story = require('../story/Story');
const Comment = require('../comment/Comment');
const Conversation = require('../chat/Conversation');
const Message = require('../chat/Message');
const Notification = require('../notification/Notification');
const Feedback = require('../feedback/Feedback');
const Report = require('../admin/Report');
const RefreshToken = require('../auth/RefreshToken');
const { getRedisOptional } = require('../../config/redis');
const { deleteFromCloudinary } = require('../../utils/cloudinary.utils');
const logger = require('../../config/logger');

/*
 * Removing a user touches thirteen collections plus Cloudinary and Redis. This
 * lives in its own module rather than in user.service.js because user.service
 * already requires notification.service, and pulling thirteen models onto that
 * request-path module invites a circular require.
 *
 * There is no transaction. Multi-document transactions need a replica set, and
 * both a local mongod and the mongodb-memory-server used by the test suite run
 * standalone, so a transaction would make this untestable and undeployable
 * locally. The design is crash-safe by ordering instead: the User document is
 * deleted LAST, so an interrupted purge leaves the row still flagged expired and
 * the next cron tick finishes the job. Every step is therefore written to be
 * idempotent.
 *
 * The one step that is not naturally idempotent is the counter arithmetic in
 * decrementFollowCounts / the like and comment counters: it reads join rows,
 * decrements a denormalised counter, then deletes those rows. A crash between
 * the decrement and the delete double-decrements on retry. The $max clamp bounds
 * that to zero rather than letting counters go negative.
 */

const { clampedDecrement } = require('../../utils/counters.utils');

// Group a list of {targetId, targetModel} rows into per-model id->count maps.
const tallyByModel = (rows) => {
    const tally = {};
    for (const row of rows) {
        const model = row.targetModel;
        if (!tally[model]) tally[model] = new Map();
        const id = String(row.targetId);
        tally[model].set(id, (tally[model].get(id) || 0) + 1);
    }
    return tally;
};

// Apply a per-id counter decrement. One updateOne per distinct id, batched.
const applyTally = async (Model, field, counts) => {
    if (!counts || counts.size === 0) return;
    const ops = [];
    for (const [id, amount] of counts) {
        ops.push({ updateOne: { filter: { _id: id }, update: clampedDecrement(field, amount) } });
    }
    await Model.bulkWrite(ops, { ordered: false });
};

// Cloudinary deletes must never abort a purge that has already removed rows.
const destroyMedia = async (assets) => {
    const real = assets.filter((a) => a && a.publicId);
    if (!real.length) return;
    await Promise.allSettled(
        real.map((a) => deleteFromCloudinary(a.publicId, a.resourceType || 'image')),
    );
};

/**
 * Delete a user and everything they own.
 *
 * Safe to call twice: a second run finds nothing and returns { skipped: true }.
 *
 * @param {string} userId
 * @returns {Promise<object>} counts of what was removed
 */
const purgeUser = async (userId) => {
    const user = await User.findById(userId).select('username avatarPublicId').lean();
    if (!user) return { skipped: true };

    const counts = {
        posts: 0,
        stories: 0,
        comments: 0,
        likes: 0,
        follows: 0,
        conversations: 0,
        messages: 0,
        notifications: 0,
    };

    // 1. Capture the follow graph before deleting the edges. followerIds is
    //    needed later to evict this user's posts from other people's feeds.
    const [followingRows, followerRows] = await Promise.all([
        Follower.find({ follower: userId }).select('following').lean(),
        Follower.find({ following: userId }).select('follower').lean(),
    ]);
    const followingIds = followingRows.map((r) => r.following);
    const followerIds = followerRows.map((r) => r.follower);

    // 2. Correct both sides of the follow counters, then drop the edges. This is
    //    what un-inflates the admins that guestLogin auto-followed.
    if (followingIds.length) {
        await User.updateMany({ _id: { $in: followingIds } }, clampedDecrement('followersCount'));
    }
    if (followerIds.length) {
        await User.updateMany({ _id: { $in: followerIds } }, clampedDecrement('followingCount'));
    }
    const followRes = await Follower.deleteMany({
        $or: [{ follower: userId }, { following: userId }],
    });
    counts.follows = followRes.deletedCount;

    // 3. Likes this user gave to other people's content.
    const givenLikes = await Like.find({ user: userId }).select('targetId targetModel').lean();
    if (givenLikes.length) {
        const tally = tallyByModel(givenLikes);
        await applyTally(Post, 'likesCount', tally.Post);
        await applyTally(Comment, 'likesCount', tally.Comment);
        const res = await Like.deleteMany({ user: userId });
        counts.likes += res.deletedCount;
    }

    // 4. Comments this user wrote on other people's content. Their own posts'
    //    comments are handled wholesale in step 5.
    const ownComments = await Comment.find({ author: userId }).select('post').lean();
    if (ownComments.length) {
        const commentIds = ownComments.map((c) => c._id);
        const postTally = new Map();
        for (const c of ownComments) {
            if (c.post) postTally.set(String(c.post), (postTally.get(String(c.post)) || 0) + 1);
        }
        await applyTally(Post, 'commentsCount', postTally);

        // Replies other people left on these comments, and likes on all of them.
        const replyRes = await Comment.deleteMany({ parentComment: { $in: commentIds } });
        const likeRes = await Like.deleteMany({
            targetModel: 'Comment',
            targetId: { $in: commentIds },
        });
        counts.likes += likeRes.deletedCount;

        const res = await Comment.deleteMany({ author: userId });
        counts.comments += res.deletedCount + replyRes.deletedCount;
    }

    // 5. Posts this user authored, with everything hanging off them.
    const ownPosts = await Post.find({ author: userId })
        .select('mediaPublicId mediaType')
        .lean();
    let postIds = [];
    if (ownPosts.length) {
        postIds = ownPosts.map((p) => p._id);

        // Comments by anyone on these posts, and the likes on those comments.
        const postComments = await Comment.find({ post: { $in: postIds } }).select('_id').lean();
        if (postComments.length) {
            const ids = postComments.map((c) => c._id);
            await Like.deleteMany({ targetModel: 'Comment', targetId: { $in: ids } });
            const res = await Comment.deleteMany({ post: { $in: postIds } });
            counts.comments += res.deletedCount;
        }

        const likeRes = await Like.deleteMany({ targetModel: 'Post', targetId: { $in: postIds } });
        counts.likes += likeRes.deletedCount;

        // Other users' bookmarks pointing at posts that are about to vanish.
        await SavedPost.deleteMany({ post: { $in: postIds } });

        await destroyMedia(
            ownPosts.map((p) => ({
                publicId: p.mediaPublicId,
                resourceType: p.mediaType === 'video' ? 'video' : 'image',
            })),
        );

        const res = await Post.deleteMany({ author: userId });
        counts.posts = res.deletedCount;
    }

    // 6. Stories authored, plus this user's view records on everyone else's.
    const ownStories = await Story.find({ author: userId })
        .select('mediaPublicId mediaType')
        .lean();
    if (ownStories.length) {
        await destroyMedia(
            ownStories.map((s) => ({
                publicId: s.mediaPublicId,
                resourceType: s.mediaType === 'video' ? 'video' : 'image',
            })),
        );
        const res = await Story.deleteMany({ author: userId });
        counts.stories = res.deletedCount;
    }
    await Story.updateMany({ viewers: userId }, { $pull: { viewers: userId } });

    // 7. This user's own bookmarks.
    await SavedPost.deleteMany({ user: userId });

    // 8. Chat. Conversations here are one to one, so a participant leaving means
    //    the thread has no reason to exist.
    const convos = await Conversation.find({ participants: userId }).select('_id').lean();
    if (convos.length) {
        const convoIds = convos.map((c) => c._id);
        const msgs = await Message.find({ conversation: { $in: convoIds } })
            .select('mediaPublicId mediaType')
            .lean();

        await destroyMedia(
            msgs.map((m) => ({
                publicId: m.mediaPublicId,
                resourceType: m.mediaType === 'video' || m.mediaType === 'audio' ? 'video' : 'image',
            })),
        );

        const msgRes = await Message.deleteMany({ conversation: { $in: convoIds } });
        counts.messages = msgRes.deletedCount;
        const convoRes = await Conversation.deleteMany({ _id: { $in: convoIds } });
        counts.conversations = convoRes.deletedCount;
    }

    // Defensive: strip this user from any conversation that survived, e.g. a
    // future group thread, and from reactions on other people's messages.
    await Message.updateMany(
        { 'reactions.user': userId },
        { $pull: { reactions: { user: userId } } },
    );
    await Conversation.updateMany(
        {},
        {
            $pull: {
                participants: userId,
                clearedBy: { user: userId },
                'metadata.pinned': userId,
                'metadata.muted': userId,
                'metadata.archived': userId,
                'metadata.deleted': userId,
            },
            $unset: { [`unreadCounts.${userId}`]: '' },
        },
    );

    // 9. Notifications in both directions, plus any pointing at content that no
    //    longer exists.
    const notifRes = await Notification.deleteMany({
        $or: [{ recipient: userId }, { sender: userId }],
    });
    counts.notifications = notifRes.deletedCount;

    if (postIds.length) {
        const res = await Notification.deleteMany({ entityId: { $in: postIds } });
        counts.notifications += res.deletedCount;
    }

    // 10. Refresh tokens, so a purged user's outstanding sessions cannot be
    //     rotated into new ones before they expire.
    await RefreshToken.deleteMany({ user: userId });

    // 11. Feedback and reports.
    await Feedback.deleteMany({ userId });
    await Report.deleteMany({
        $or: [{ reporter: userId }, { targetType: 'User', targetId: userId }],
    });
    await Report.updateMany({ resolvedBy: userId }, { $unset: { resolvedBy: '' } });

    // 12. Redis. Cache only, never a source of truth, and a client that exists
    //     may still be closed and reject every command, so this is both
    //     null-checked and isolated: a Redis failure must not abort a purge that
    //     has already deleted rows from Mongo.
    try {
        const redis = getRedisOptional();
        if (redis) {
            await redis.del([`feed:user:${userId}`, `user:${userId}`, `online:${userId}`]);

            const contentIds = postIds.map(String);
            if (contentIds.length) {
                await redis.del(contentIds.map((id) => `post:${id}`));

                // Evict this user's posts from every follower's ranked feed.
                if (followerIds.length) {
                    const pipeline = redis.multi();
                    for (const followerId of followerIds) {
                        pipeline.zRem(`feed:user:${followerId}`, contentIds);
                    }
                    await pipeline.exec();
                }
            }
        }
    } catch (err) {
        logger.warn(`[UserPurge] Redis cleanup skipped for ${userId}: ${err.message}`);
    }

    // 13. Avatar.
    await destroyMedia([{ publicId: user.avatarPublicId, resourceType: 'image' }]);

    // 13. The user row itself, last, so a crash anywhere above is recoverable.
    await User.findByIdAndDelete(userId);

    logger.info(
        `[UserPurge] Removed @${user.username}: ${counts.posts} posts, ` +
            `${counts.comments} comments, ${counts.likes} likes, ${counts.follows} follows, ` +
            `${counts.messages} messages`,
    );

    return { skipped: false, username: user.username, ...counts };
};

module.exports = { purgeUser };
