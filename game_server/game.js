/* ゲームの設定、マップの作成など */


'use strict';

//ハッシュ計算用ライブラリの読み込み
const crypto = require('crypto');


//ゲームで使用する値を格納するオブジェクト
/* ゲームに設定で必要になった値は、このgameObjに設定していく */
const gameObj = {
  playersMap: new Map(),  //ゲームに参加しているプレイヤー全員の情報を入れておく連想配列
  itemsMap: new Map(),  //ミサイル（魚雷）のアイテム情報を入れておく連想配列
  airMap: new Map(),  //酸素のアイテム情報を入れておく連想配列
  fieldWidth: 1000,  //ゲームの横幅
  fieldHeight: 1000,  //ゲームの横幅
  itemTotal: 15,  //ゲームに出現するミサイルのアイテム数
  airTotal: 10,  //ゲームに出現する酸素のアイテム数
  itemRadius: 4,  //ミサイルアイテムの当たり判定用
  airRadius: 6,  //酸素アイテムの当たり判定用
  addAirTime: 30,  //酸素アイテムを取得した時の酸素増加量
  submarineImageWidth: 42  //潜水艦の当たり判定用
};


//ゲームの初期設定をする関数
//ミサイルアイテムと酸素アイテムを、gameObjに設定した個数だけ追加していく
//追加先はそれぞれ、gameObj.itemsMap と gameObj.airMap
function init() {
  for(let i = 0; i < gameObj.itemTotal; i++){
    addItem();
  };
  for(let a = 0; a < gameObj.airTotal; a++){
    addAir();
  };
};

init();  //ゲームの初期化（初期化はサーバ起動時に行う）


//サーバーで潜水艦を移動させる処理を33ミリ秒ごとに呼び出す
const gameTicker = setInterval(() => {
  movePlayers(gameObj.playersMap);

  //アイテムの取得チェック
  checkGetItem(gameObj.playersMap, gameObj.itemsMap, gameObj.airMap);  
}, 33);


//新しい接続を作り、ユーザをゲームに参加させ、ゲームの現在の状態を返す
function newConnection(socketId, displayName, thumbUrl) {

  //プレイヤー（潜水艦）の初期座標を乱数で設定
  const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
  const playerY = Math.floor(Math.random() * gameObj.fieldHeight);

  //プレイヤーのIDを、socketIdをもとにハッシュ関数で生成
  const playerId = crypto.createHash('sha1').update(socketId).digest('hex');

  //プレイヤーデータを持ったオブジェクト(初期値、ゲームの状態によって随時上書き更新される)
  const playerObj = {
    x: playerX,
    y: playerY,
    playerId: playerId,
    displayName: displayName,
    thumbUrl: thumbUrl,
    isAlive: true,  //生存フラグ（初期状態は生存なのでtrue）
    direction: 'right',  //潜水艦の進行方向（初期は右向き）
    missilesMany: 0,  //ミサイルアイテム所持数
    airTime: 99,  //酸素所持量
    aliveTime: {'clock': 0, 'seconds': 0},  //プレイヤーの生存時間
    score: 0  //得点（初期は0点）
  };

  //socketIdとplayerObjを、gameObj.playersMap連想配列に追加
  //socketIdによって、ユーザを区別する
  gameObj.playersMap.set(socketId, playerObj);

  //ゲームの設定などをオブジェクトに入れて、リターンで返す
  const startObj = {
    playerObj: playerObj,
    fieldWidth: gameObj.fieldWidth,
    fieldHeight: gameObj.fieldHeight
  };
  return startObj;
};


//マップ情報を作成して返す関数
/* 
  gameObj.playersMapとgameObj.itemsMap、gameObj.airMapを返すだけだが、
  オブジェクトのままだと通信で送るにはデータとして大きすぎるので、
  値だけを配列に入れて返すようにする。
*/
function getMapData() {
  const playersArray = [];
  const itemsArray = [];
  const airArray = [];

  for(let [socketId, player] of gameObj.playersMap) {
    const playerDataForSend = [];

    playerDataForSend.push(player.x);
    playerDataForSend.push(player.y);
    playerDataForSend.push(player.playerId);
    playerDataForSend.push(player.displayName);
    playerDataForSend.push(player.score);
    playerDataForSend.push(player.isAlive);
    playerDataForSend.push(player.direction);
    playerDataForSend.push(player.missilesMany);
    playerDataForSend.push(player.airTime);

    playersArray.push(playerDataForSend);
  };

  for(let [id, item] of gameObj.itemsMap) {
    const itemDataForSend = [];

    itemDataForSend.push(item.x);
    itemDataForSend.push(item.y);

    itemsArray.push(itemDataForSend);
  };

  for(let [id, air] of gameObj.airMap) {
    const airDataForSend = [];

    airDataForSend.push(air.x);
    airDataForSend.push(air.y);

    airArray.push(airDataForSend);
  }

  return [playersArray, itemsArray, airArray];  //2重配列を返す
};


//潜水艦の進行方向を変える関数
function updatePlayerDirection(socketId, direction) {
  const playerObj = gameObj.playersMap.get(socketId);  //socketIdを元に、方向変換するユーザデータを取り出す
  playerObj.direction = direction;  //方向を変更
};


//プレイヤーの接続が切れた時の処理
function disconnect(socketId) {
  //接続が切れた場合はゲーム離脱と判断し、playersMapからプレイヤーデータを削除する
  gameObj.playersMap.delete(socketId);
};


//ミサイルアイテムをマップに追加する関数
function addItem() {

  //ミサイルアイテムの出現座標を設定
  const itemX = Math.floor(Math.random() * gameObj.fieldWidth);
  const itemY = Math.floor(Math.random() * gameObj.fieldHeight);
  const itemKey = `${itemX},${itemY}`;

  //ミサイルアイテムの出現位置が被ってしまった場合は、再度やり直す
  if(gameObj.itemsMap.has(itemKey)) {
    return addItem();
  };

  const itemObj = {
    x: itemX,
    y: itemY
  };

  //ミサイルアイテムの出現座標をキーとセットにしてgameObj.itemsMapに追加
  gameObj.itemsMap.set(itemKey, itemObj);
};


//酸素アイテムをマップに追加する関数
function addAir() {

  //酸素アイテムの出現座標を設定
  const airX = Math.floor(Math.random() * gameObj.fieldWidth);
  const airY = Math.floor(Math.random() * gameObj.fieldHeight);
  const airKey = `${airX},${airY}`;

  //酸素アイテムの出現位置が被ってしまった場合は、再度やり直す
  if(gameObj.airMap.has(airKey)){
    return addAir();
  };

  const airObj = {
    x: airX,
    y: airY
  };

  //酸素アイテムの出現座標をキーとセットにしてgameObj.airMapに追加
  gameObj.airMap.set(airKey, airObj);
};


//潜水艦を移動する処理
function movePlayers(playersMap) {

  //全てのプレイヤーで行うのでループ
  for(let [playerId, player] of playersMap) {

    //当該プレイヤーがゲームオーバーになった場合は、次のループ（次のユーザ）に移る
    if(player.isAlive === false) {
      continue;
    };

    //潜水艦の向きに応じて、潜水艦の座標を変更する（これで"潜水艦の移動"が実現できる）
    switch (player.direction) {
      case 'left':
        player.x -= 1;
        break;
      case 'up':
        player.y -= 1;
        break;
      case 'down':
        player.y += 1;
        break;
      case 'right':
        player.x += 1;
        break;
    }

    //今回のマップは地球のように端と端が繋がっているので、座標がゲームの横幅と縦幅を超えたor0以下になったなら、反対の端へ移動
    if(player.x > gameObj.fieldWidth) player.x -= gameObj.fieldWidth;
    if(player.x < 0) player.x += gameObj.fieldWidth;
    if(player.y < 0) player.y += gameObj.fieldHeight;
    if(player.y > gameObj.fieldHeight) player.y -= gameObj.fieldHeight;

    /* 
      生存時間を計測し、
      player.aliveTime.clockが30に達したら、player.aliveTime.secondsを1、player.aliveTime.clockを0にし、
      decreaseAir()で所持酸素アイテムをひとつ減らし、プレイヤーの点数を1点増やす 
    */
    player.aliveTime.clock += 1;
    if(player.aliveTime.clock === 30){
      player.aliveTime.clock = 0;
      player.aliveTime.seconds += 1;
      decreaseAir(player);
      player.score += 1;
    }
  };
};


//酸素の残り量(playerObj.airTime)を減らす
//酸素の残り量が0になればゲームオーバー
function decreaseAir(playerObj) {
  playerObj.airTime -= 1;
  if(playerObj.airTime === 0){
    playerObj.isAlive = false;
  }
};


//アイテムの取得
function checkGetItem(playersMap, itemsMap, airMap) {

  //参加プレイヤー全員に行うので、for文でループ
  for (let [hashKey, playerObj] of playersMap) {

    //ゲームオーバのプレイヤーは処理せず、次のループ(プレイヤー)へ
    if(playerObj.isAlive === false) continue;

    //ミサイルアイテム(赤丸)
    for(let [itemKey, itemObj] of itemsMap) {

      //まず、潜水艦とアイテムの距離を計算
      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, itemObj.x, itemObj.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      /* 
        潜水艦とアイテムの距離が、「潜水艦の当たり判定 + ミサイルアイテムの当たり判定」以下なら、接触(アイテムGET)とする
        その上で、 
          ミサイルのアイテムをゲームから削除する
          ミサイルの所持数を1つ増やすが、所持できる上限は6個である
          ミサイルのアイテムをフィールドのどこかに追加する
        の3つの処理を行う
      */
      if(
        distanceObj.distanceX <= (gameObj.submarineImageWidth / 2 + gameObj.itemRadius) &&
        distanceObj.distanceY <= (gameObj.submarineImageWidth / 2 + gameObj.itemRadius)
      ) {
        gameObj.itemsMap.delete(itemKey);
        playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
        addItem();
      }
    }

    //酸素アイテム(青丸)
    /* 
      酸素アイテム取得も、ミサイルアイテムと同様に行う
      ただし、酸素アイテムの所持できる上限は99個とする
    */
    for(let [airKey, airObj] of airMap) {
      const distanceObj = calculationBetweenTwoPoints(
        playerObj.x, playerObj.y, airObj.x, airObj.y, gameObj.fieldWidth, gameObj.fieldHeight
      );

      if(
        distanceObj.distanceX <= (gameObj.submarineImageWidth / 2 + gameObj.airRadius) &&
        distanceObj.distanceY <= (gameObj.submarineImageWidth / 2 + gameObj.airRadius)
      ) {
        gameObj.airMap.delete(airKey);
        if(playerObj.airTime + gameObj.addAirTime > 99) {
          playerObj.airTime = 99;
        } else {
          playerObj.airTime += gameObj.addAirTime;
        }
        addAir();
      }
    }
  }
};


//衝突判定用
function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight) {
  let distanceX = 99999999;
  let distanceY = 99999999;

  if(pX <= oX) {
    distanceX = oX - pX;
    let tmpDistance = pX + gameWidth - oX;
    if(distanceX > tmpDistance){
      distanceX = tmpDistance;
    }
  } else {
    distanceX = pX - oX;
    let tmpDistance = oX + gameWidth -pX;
    if(distanceX > tmpDistance){
      distanceX = tmpDistance;
    }
  }

  if(pY <= oY){
    distanceY = oY - pY;
    let tmpDistance = pY + gameHeight - oY;
    if(distanceY > tmpDistance){
      distanceY = tmpDistance;
    }
  } else {
    distanceY = pY - oY;
    let tmpDistance = oY + gameHeight - pY;
    if(distanceY > tmpDistance){
      distanceY = tmpDistance;
    }
  }
  
  return {
    distanceX,
    distanceY
  };
};


//ここで作った関数をエキスポート
module.exports = {
  newConnection,
  getMapData,
  updatePlayerDirection,
  disconnect
};
