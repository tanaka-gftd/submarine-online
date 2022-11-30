var express = require('express');
var router = express.Router();

/* GET home page. */
/* Twitterログイン機能を実装していないので、req.user変数には何も入らずNullのまま */
router.get('/', function(req, res, next) {
  res.render('index', { title: '潜水艦ゲーム', user: req.user });
});

module.exports = router;
