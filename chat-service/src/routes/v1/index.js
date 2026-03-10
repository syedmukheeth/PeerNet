'use strict';

const router = require('express').Router();
const messageRoutes = require('./message.routes');

router.use('/conversations', messageRoutes);

module.exports = router;
