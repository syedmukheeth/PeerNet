'use strict';

const dscrollService = require('../services/dscroll.service');
const { parsePagination } = require('../utils/pagination.utils');

const createDscroll = async (req, res, next) => {
    try {
        const dscroll = await dscrollService.createDscroll(req.user._id, req.body, req.file);
        res.status(201).json({ success: true, data: dscroll });
    } catch (err) { next(err); }
};

const getDscrollsFeed = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await dscrollService.getDscrollsFeed({ limit, cursor, userId: req.user._id });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
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
