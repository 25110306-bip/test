const express = require('express');
const { createBotChallenge } = require('../utils/botCheck');

const router = express.Router();

router.get('/challenge', (req, res) => {
  res.json({ challenge: createBotChallenge(), message: 'Giải phép tính để xác minh bạn không phải bot.' });
});

module.exports = router;
