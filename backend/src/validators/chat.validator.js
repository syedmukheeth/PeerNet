'use strict';

const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

/**
 * targetUserId used to be read straight off the body with no validation.
 * Undefined produced a TypeError 500, and an object body such as
 * {"targetUserId": {"$ne": null}} flowed into the $all query as an operator.
 */
const createConversationSchema = Joi.object({
    targetUserId: objectId.required(),
});

const postMessageSchema = Joi.object({
    body: Joi.string().max(4000).allow(''),
    mediaUrl: Joi.string().uri().allow(''),
    mediaType: Joi.string().valid('image', 'video', 'audio', 'file', 'none'),
    replyTo: objectId.allow(null, ''),
    clientSideId: Joi.string().max(100),
}).or('body', 'mediaUrl');

const editMessageSchema = Joi.object({
    body: Joi.string().trim().min(1).max(4000).required(),
});

const reactMessageSchema = Joi.object({
    emoji: Joi.string().min(1).max(16).required(),
});

/*
 * Pin, mute and archive are per participant and each is an independent
 * boolean. `.or` requires at least one, so an empty body is rejected rather
 * than quietly doing nothing.
 */
const conversationStateSchema = Joi.object({
    pinned: Joi.boolean(),
    muted: Joi.boolean(),
    archived: Joi.boolean(),
}).or('pinned', 'muted', 'archived');

module.exports = {
    conversationStateSchema,
    createConversationSchema,
    postMessageSchema,
    editMessageSchema,
    reactMessageSchema,
};
