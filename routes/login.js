var express = require('express');
var router = express.Router();

//twiiterを使用したログイン機能は未実装であることを知らせる（404エラーにはしない）
router.get('/', function(req, res, next) {
  res.render('login', { message: 'twiiterを使用したログイン機能は未実装です'});
});

module.exports = router;