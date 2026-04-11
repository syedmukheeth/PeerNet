'use strict';

const dscrollService = require('./dscroll.service');
const { parsePagination } = require('../../utils/pagination.utils');

const createDscroll = async (req, res, next) => {
    try {
        console.log('[Dscroll] createDscroll called');
        console.log('[Dscroll] req.file:', req.file);
        console.log('[Dscroll] req.body:', req.body);
        console.log('[Dscroll] user:', req.user?._id);

        if (!req.file) {
            console.log('[Dscroll] ERROR: No file received by multer');
            return res.status(400).json({ success: false, message: 'No video file received. Make sure the field name is "video".' });
        }

        const dscroll = await dscrollService.createDscroll(req.user._id, req.body, req.file);
        console.log('[Dscroll] Success! Post ID:', dscroll._id);
        res.status(201).json({ success: true, data: dscroll });
    } catch (err) {
        console.error('[Dscroll] createDscroll ERROR:', err.message, err.stack);
        next(err);
    }
};

const getDscrollsFeed = async (req, res, next) => {
    try {
        console.log('[Dscroll] getDscrollsFeed called, user:', req.user?._id);
        const { limit, cursor } = parsePagination(req.query);
        const result = await dscrollService.getDscrollsFeed({ limit, cursor, userId: req.user._id });
        console.log('[Dscroll] getDscrollsFeed count:', result.data?.length);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Dscroll] getDscrollsFeed ERROR:', err.message);
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
