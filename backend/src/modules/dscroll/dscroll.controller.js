'use strict';

const dscrollService = require('./dscroll.service');
const { parsePagination } = require('../../utils/pagination.utils');
const logger = require('../../config/logger');

const createDscroll = async (req, res, next) => {
    try {
        if (!req.file) {
            logger.warn(`DscrollController: No file received in request from user ${req.user?._id}`);
            return res.status(400).json({ success: false, message: 'No video file received.' });
        }

        const dscroll = await dscrollService.createDscroll(req.user._id, req.body, req.file);
        logger.info(`DscrollController: Success - Created Dscroll ${dscroll._id}`);
        res.status(201).json({ success: true, data: dscroll });
    } catch (err) {
        logger.error(`DscrollController: createDscroll error - ${err.message}`);
        next(err);
    }
};

const getDscrollsFeed = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await dscrollService.getDscrollsFeed({ limit, cursor, userId: req.user._id });
        res.json({ success: true, ...result });
    } catch (err) {
        logger.error(`DscrollController: getDscrollsFeed error - ${err.message}`);
        next(err);
    }
};

const deleteDscroll = async (req, res, next) => {
    try {
        await dscrollService.deleteDscroll(req.params.id, req.user._id);
        res.json({ success: true, message: 'Dscroll deleted' });
    } catch (err) { next(err); }
};

const likeDscroll = async (req, res, next) => {
    try {
        const result = await dscrollService.likeDscroll(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unlikeDscroll = async (req, res, next) => {
    try {
        const result = await dscrollService.unlikeDscroll(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { createDscroll, getDscrollsFeed, deleteDscroll, likeDscroll, unlikeDscroll };
