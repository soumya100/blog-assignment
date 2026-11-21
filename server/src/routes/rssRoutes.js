const express = require('express');
const { getFeed } = require('../controllers/rssController');

const router = express.Router();
router.get('/', getFeed);

module.exports = router;
