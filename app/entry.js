'use strict';

//jQueryを導入、$に格納（以降、本ファイルの$はjQueryライブラリが入っています）
import $ from 'jquery';

import io from 'socket.io-client';

/* 
  canvasタグについて
  https://developer.mozilla.org/ja/docs/Web/API/Canvas_API
*/

/* 
  キャンバス全体を削除 （参考）https://developer.mozilla.org/ja/docs/Web/API/CanvasRenderingContext2D/clearRect
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
*/

//ゲームを描画する時に使用する値を、オブジェクトで設定
const gameObj = {
  raderCanvasWidth: 500,
  raderCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  itemRadius: 4,  //ミサイルアイテムの大きさ（円で描画するので半径）をせってお
  airRadius: 5,  //ミサイルアイテムの大きさ（円で描画するので半径）をせってお
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),  //data-*でグローバル変数として設定
  myThumbUrl: $('#main').attr('data-thumbUrl'),  //data-*でグローバル変数として設定
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  airMap: new Map()
};

//websocketで通信するデータ(twitterのアカウント名とサムネイルURL)を設定
const socketQueryParameters = `displayName=${gameObj.myDisplayName}&thumbUrl=${gameObj.myThumbUrl}`;

//サーバのIPアドレスにwebsocket通信を開始要求リクエスト＆データ(twitterのアカウント名とサムネイルURL)も送る
const socket = io($('#main').attr('data-ipAddress') + '?' + socketQueryParameters);


//最初に実行して欲しい処理をまとめた関数
function init() {

  //ゲーム用のキャンバス
  const raderCanvas = $('#rader')[0];  //game.pug内のid=raderとなる要素を取得
  raderCanvas.width = gameObj.raderCanvasWidth;  //ゲームの表示エリアの縦幅設定
  raderCanvas.height = gameObj.raderCanvasHeight;  //ゲームの表示エリアの横幅設定
  gameObj.ctxRader = raderCanvas.getContext('2d');  //設定した値を、gameObjにctxRaderプロパティとして追加（2dとは二次元画像の意味）

  //ランキング用のキャンバス
  const scoreCanvas = $('#score')[0];  //game.pug内のid=scoreとなる要素を取得
  scoreCanvas.width = gameObj.scoreCanvasWidth;  //ランキングの表示エリアの縦幅設定
  scoreCanvas.height = gameObj.scoreCanvasHeight;  //ランキングの表示エリアの横幅設定
  gameObj.ctxScore = scoreCanvas.getContext('2d');  //設定した値を、gameObjにctxStoreプロパティとして追加

  //潜水艦の画像
  const submarineImage = new Image();
  submarineImage.src = '/images/submarine.png';
  gameObj.submarineImage = submarineImage;  //画像のあるURLを、gameObjにsubmarineImageプロパティとして追加
};

init();

//キャンバスの中身を削除 → レーダーを描画、潜水艦を描画、という処理
function ticker() {
  gameObj.ctxRader.clearRect(0, 0, gameObj.raderCanvasWidth, gameObj.raderCanvasHeight);  //ゲーム用のキャンバスの中身を削除
  drawRader(gameObj.ctxRader);  //レーダーを描画
  drawSubmarine(gameObj.ctxRader);  //潜水艦を描画
};

//ticker関数を、33ミリ秒ごとに実行
setInterval(ticker, 33);


//レーダーを描画する関数
//潜水艦のレーダーを表現するために、半透明の緑色の扇を回転させるようにする
//扇の描画、扇の削除、5度分座標をずらして扇を再描画...を繰り返すことで、扇が回転する表現を実現
function drawRader(ctxRader) {

  //中心座標と半径を計算したら、それぞれを変数に入れる
  const x = gameObj.raderCanvasWidth / 2;
  const y = gameObj.raderCanvasHeight / 2;
  const r = gameObj.raderCanvasWidth * 1.5 / 2;  //対角線の長さの半分（？）

  //扇型のレーダーを中心で回転させるために、キャンバスの座標を移動＆回転させるため、現在のキャンバスの状態を一旦保存
  ctxRader.save();

  //新しい描画を開始
  ctxRader.beginPath();

  //座標を設定。ゲームエリアの中央が座標（原点）となるようににする
  ctxRader.translate(x, y);

  //座標をgameObj.deg度回転させる(ctxRader.rotateでは弧度法を使うため、ラジアンを求める関数を別途で定義してある)
  ctxRader.rotate(getRadian(gameObj.deg));

  //描画する扇の色と透明度を設定(ここでは半透明の緑色)
  ctxRader.fillStyle = 'rgba(0, 220, 0, 0.5)';

  //扇の弧の部分を、原点(0, 0)を中心に半径rで30度だけ描画する
  ctxRader.arc(0, 0, r, getRadian(0), getRadian(-30), true);

  //弧の端から原点(0, 0)に向かって線を引く
  ctxRader.lineTo(0, 0);

  //描画したエリアを塗りつぶす →　扇の描画の完了
  ctxRader.fill();

  //座標の状態を、ctxRader.save();で保存していた設定に戻す
  ctxRader.restore();

  //角度を5度分だけ足す
  gameObj.deg = (gameObj.deg + 5) % 360;
};


//潜水艦を描画する関数
//（こちらも繰り返すようだ）
function drawSubmarine(ctxRader) {

  //座標を中心に設定するので、canvasの状態を ctxRader.save();で保存し、ctxRader.translateで座標をcanvasの中心に設定する
  ctxRader.save();
  ctxRader.translate(gameObj.raderCanvasWidth / 2, gameObj.raderCanvasHeight / 2);

  //潜水艦の画像を表示する位置を設定
  ctxRader.drawImage(
    gameObj.submarineImage, -(gameObj.submarineImage.width / 2), -(gameObj.submarineImage.height / 2)
  );

  ctxRader.restore();
};


/* 
  socket.on('イベント名', 関数) でWebSocketデータを受信した時の処理を実装。

  Socket.IO で行う通信は通信に名前が付いており、
  socket.on('start data', (startObj) => {} は start data という名前のデータを受け取ったときに実行される
*/
//フロントでの描画のために、WebSocketサーバから受け取った値(ゲームの横幅と縦幅、プレイヤー情報)を保存
socket.on('start data', (startObj) => {

  //引数で受け取ったオブジェクトから、各値を取り出す
  /* 引数の中身 {playerObj: playerObj, fieldWidth: gameObj.fieldWidth, fieldHeight: gameObj.fieldHeight}; */
  gameObj.fieldWidth = startObj.fieldWidth;  //ゲームの横幅
  gameObj.fieldHeight = startObj.fieldHeight;  //ゲームの縦幅
  gameObj.myPlayerObj = startObj.playerObj;  //プレイヤーデータを持ったオブジェクト
});


//socket.on('map data', (compressed) => {} は map data という名前のデータを受け取ったときに実行される
//フロントでの描画のために、WebSocketサーバから受け取った値(ゲームの現在の状態、ミサイルアイテムの座標、酸素アイテムの座標)を保存、更新
socket.on('map data', (compressed) => {

  /* 
    引数として受け取るのは2重配列 構造 → [playersArray, itemsArray, airArray]
    playersArray...参加プレイヤーの各情報を格納した配列
    itemsArray...ミサイルアイテムの座標を格納した配列
    airArray...酸素アイテムの座標を格納した配列
  */
  const playersArray = compressed[0];
  const itemsArray = compressed[1];
  const airArray = compressed[2];

  //新しいmapを作成し、playersMapと命名し、gameObjに追加
  gameObj.playersMap = new Map();

  //WebSocketサーバから受け取ったプレイヤーの各情報をオブジェクトとして保存 → ゲーム内容更新、をプレイヤーの人数分繰り返す
  for(let compressedPlayerData of playersArray) {

    //WebSocketサーバから受け取ったプレイヤーの各情報を、配列から取り出してオブジェクトへ格納
    const player = {};
    player.x = compressedPlayerData[0];
    player.y = compressedPlayerData[1];
    player.playerId = compressedPlayerData[2];
    player.displayName = compressedPlayerData[3];
    player.score = compressedPlayerData[4];
    player.isAlive = compressedPlayerData[5];
    player.direction = compressedPlayerData[6];

    //gameObjのplayersMapに、WebSocketサーバから受け取ったプレイヤーの各情報を追加()
    gameObj.playersMap.set(player.playerId, player);

    //ゲームの現在の状態を示す各値を更新していく
    //player.playerId ...WebSocketサーバから受け取ったプレイヤーのID
    //gameObj.myPlayerObj.playerId...ゲーム開始時に作成されたプレイヤーのID
    if(player.playerId === gameObj.myPlayerObj.playerId) {
      gameObj.myPlayerObj.x = compressedPlayerData[0];
      gameObj.myPlayerObj.y = compressedPlayerData[1];
      gameObj.myPlayerObj.displayName = compressedPlayerData[3];
      gameObj.myPlayerObj.score = compressedPlayerData[4];
      gameObj.myPlayerObj.isAlive = compressedPlayerData[5];
    }
  };

  //ミサイルアイテムの出現順とその出現座標を格納したmapを、gameObjに追加
  gameObj.itemsMap = new Map();
  itemsArray.forEach((compressedItemData, index) => {
    gameObj.itemsMap.set(index, {x:compressedItemData[0], y:compressedItemData[1]});
  });

  //酸素アイテムの出現順とその出現座標を格納したmapを、gameObjに追加
  gameObj.airMap = new Map();
  airArray.forEach((compressedAirData, index) => {
    gameObj.airMap.set(index, {x:compressedAirData[0], y:compressedAirData[1]});
  });

  //確認用
  console.log(gameObj.playersMap);  //プレイヤーID(key)と、そのプレイヤーの現在の状態(value)
  console.log(gameObj.itemsMap);  //ミサイルアイテムの出現番号(key)と、それに対応した出現座標(value)
  console.log(gameObj.airMap);  //酸素アイテムの出現番号(key)と、それに対応した出現座標(value)

});


//角度をラジアンに変換する関数
//「角度 * π / 180」という計算式で、ラジアンに変換できる
function getRadian(deg) {
  return deg * Math.PI /180;
};
