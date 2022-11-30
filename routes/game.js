const express = require('express');
const router = express.Router();
const config = require('../config');

router.get('/', (req, res, next) => {

  let displayName = 'anonymous';  //アカウント名の初期値（匿名で参加する場合に使用される）
  let thumbUrl = 'anonymous';  //サムネイル画像のパス（N予備校サイトによると未使用）

  //twitterとの連携後は、ゲーム画面にTwitterのアカウント名とサムネイル画像が表示されるようにする
  if(req.user){
    displayName = req.user.displayName;
    thumbUrl = req.user.photos[0].value;
  }
  res.render('game', {title:'潜水艦ゲーム', displayName: displayName, thumbUrl: thumbUrl, ipAddress: config.ipAddress});
});

module.exports = router;