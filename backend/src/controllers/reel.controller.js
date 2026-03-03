'use strict';

const reelService = require('../services/reel.service');
const { parsePagination } = require('../utils/pagination.utils');

const createReel = async (req, res, next) => {
    try {
        const reel = await reelService.createReel(req.user._id, req.body, req.file);
        res.status(201).json({ success: true, data: reel });
    } catch (err) { next(err); }
};

const getReelsFeed = async (req, res, next) => {
    try {
        const { limit, cursor } = parsePagination(req.query);
        const result = await reelService.getReelsFeed({ limit, cursor });
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
};

const deleteReel = async (req, res, next) => {
    try {
        await reelService.deleteReel(req.params.id, req.user._id);
        res.json({ success: true, message: 'Reel deleted' });
    } catch (err) { next(err); }
};

const likeReel = async (req, res, next) => {
    try {
        const result = await reelService.likeReel(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

const unlikeReel = async (req, res, next) => {
    try {
        const result = await reelService.unlikeReel(req.params.id, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { createReel, getReelsFeed, deleteReel, likeReel, unlikeReel };
