'use strict';

const shortsService = require('./shorts.service');
const { parsePagination } = require('../../utils/pagination.utils');
const logger = require('../../config/logger');

const createShort = async (req, res, next) => {
    try {
        if (!req.file) {
            logger.warn(`ShortsController: No file received in request from user ${req.user?._id}`);
            return res.status(400).json({ success: false, message: 'No video file received.' });
        }

        const short = await shortsService.createShort(req.user._id, req.body, req.file);
        logger.info(`ShortsController: Success - Created Short ${short._id}`);
        res.status(201).json({ success: true, data: short });
    } catch (err) {
        logger.error(`ShortsController: createShort error - ${err.message}`);
        next(err);
    }
};

const getShortsFeed = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await shortsService.getShortsFeed({ limit, cursor, userId: req.user._id });
        res.json({ success: true, ...result });
    } catch (err) {
        logger.error(`ShortsController: getShortsFeed error - ${err.message}`);
        next(err);
    }
};

const deleteShort = async (req, res, next) => {
    try {
        await shortsService.deleteShort(req.params.id, req.user._id);
        res.json({ success: true, message: 'Short deleted' });
    } catch (err) { next(err); }
};

const likeShort = async (req, res, next) => {
    try {
        const result = await shortsService.likeShort(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unlikeShort = async (req, res, next) => {
    try {
        const result = await shortsService.unlikeShort(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { createShort, getShortsFeed, deleteShort, likeShort, unlikeShort };
