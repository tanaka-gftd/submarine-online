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
  airTotal: 10  //ゲームに出現する酸素のアイテム数
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


//新しい接続を作り、ユーザをゲームに参加させ、ゲームの現在の状態を返す
function newConnection(socketId, displayName, thumbUrl) {

  //プレイヤー（潜水艦）の初期座標を乱数で設定
  const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
  const playerY = Math.floor(Math.random() * gameObj.fieldHeight);

  //プレイヤーのIDを、socketIdをもとにハッシュ関数で生成
  const playerId = crypto.createHash('sha1').update(socketId).digest('hex');

  //プレイヤーデータを持ったオブジェクト
  const playerObj = {
    x: playerX,
    y: playerY,
    playerId: playerId,
    displayName: displayName,
    thumbUrl: thumbUrl,
    isAlive: true,  //生存フラグ（初期状態は生存なのでtrue）
    direction: 'right',  //潜水艦の進行方向（初期は右向き）
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


//ここで作った関数をエキスポート
module.exports = {
  newConnection,
  getMapData,
  updatePlayerDirection,
  disconnect
};
