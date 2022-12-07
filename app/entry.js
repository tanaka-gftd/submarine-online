/* ゲームのフロントサイド（描画） */


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
  raderCanvasWidth: 500,  //レーダーに表示できる横幅
  raderCanvasHeight: 500,  //レーダーに表示できる縦幅
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  itemRadius: 4,  //ミサイルアイテムの大きさ（円で描画するので半径）を設定
  airRadius: 5,  //酸素アイテムの大きさ（円で描画するので半径）を設定
  deg: 0,
  rotationDegreeByDirection: {  //潜水艦の画像の描画する向き(角度は時計回り？)
    'left': 0,  //左方向は別で定義
    'up': 270,  //上向き
    'down': 90,  //下向き
    'right': 0  //右向き（初期値）
  },
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

  //サーバからデータを受けっとていないときは、マップを描画しない(if文を簡略化して記述してます)
  if (!gameObj.myPlayerObj || !gameObj.playersMap) return;  

  gameObj.ctxRader.clearRect(0, 0, gameObj.raderCanvasWidth, gameObj.raderCanvasHeight);  //ゲーム用のキャンバスの中身を削除
  drawRader(gameObj.ctxRader);  //レーダーを描画
  drawMap(gameObj);  //マップを描画
  drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);  //潜水艦を描画
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

  //描画したエリアを塗りつぶす → 扇の描画の完了
  ctxRader.fill();

  //座標の状態を、ctxRader.save();で保存していた設定に戻す
  ctxRader.restore();

  //角度を5度分だけ足す
  gameObj.deg = (gameObj.deg + 5) % 360;
};


//潜水艦を描画する関数（こちらも繰り返すようだ）
//方向転換時に潜水艦の画像の向きも変更できるように
function drawSubmarine(ctxRader, myPlayerObj) {

  //潜水艦の画像を回転させたい角度
  const rotationDegree = gameObj.rotationDegreeByDirection[myPlayerObj.direction];

  //座標を中心に設定するので、canvasの状態を ctxRader.save();で保存し、ctxRader.translateで座標をcanvasの中心に設定する
  ctxRader.save();
  ctxRader.translate(gameObj.raderCanvasWidth / 2, gameObj.raderCanvasHeight / 2);

  //潜水艦の画像を回転させる（左向きの場合は、画像を左右反転させる）
  ctxRader.rotate(getRadian(rotationDegree));
  if(myPlayerObj.direction === 'left') {
    ctxRader.scale(-1, 1);
  }

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
  // console.log(gameObj.playersMap);  //プレイヤーID(key)と、そのプレイヤーの現在の状態(value)
  // console.log(gameObj.itemsMap);  //ミサイルアイテムの出現番号(key)と、それに対応した出現座標(value)
  // console.log(gameObj.airMap);  //酸素アイテムの出現番号(key)と、それに対応した出現座標(value)

});


//角度をラジアンに変換する関数
//「角度 * π / 180」という計算式で、ラジアンに変換できる
function getRadian(deg) {
  return deg * Math.PI /180;
};


//マップを描画する関数
function drawMap(gameObj) {

  /* 「それぞれのMapに格納された情報から適切な点を描画する」という処理は共通化できるので、関数drawObjにまとめた */
  drawObj(gameObj.itemsMap, 255, 165, 0);
  drawObj(gameObj.airMap, 0, 220, 225);
};


//それぞれのMapに格納された情報から適切な点を描画する関数
//objには、gameObj.itemsMap か、gameObj.airMap が渡される
function drawObj(obj, r, g, b) {

  //引数で受け取ったobj()をループしてアイテムを描画
  for(let [index, item] of obj) {

    //2点間の距離を測る関数（別で実装）
    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,  //プレイヤーの座標
      item.x, item.y,  //アイテムの座標
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.raderCanvasWidth, gameObj.raderCanvasHeight
    );

    //レーダーの届く距離にあるアイテムだけを描画 & レーダーに近いアイテムはくっきり描画、レーダーから離れたアイテムは透明度をあげて描画（うっすら描画）ようにする
    if(distanceObj.distanceX <= (gameObj.raderCanvasWidth /2) && distanceObj.distanceY <= (gameObj.raderCanvasHeight / 2)) {
      const degreeDiff = calcDegreeDiffFromRader(gameObj.deg, distanceObj.degree);  //潜水艦から見たレーダーとアイテムの角度の差を計算し、その結果を保存（関数は別で実装）
      const toumeido = calcOpacity(degreeDiff);

      gameObj.ctxRader.fillStyle = `rgba(${r}, ${g}, ${b}, ${toumeido})`;
      gameObj.ctxRader.beginPath();
      gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, gameObj.itemRadius, 0, Math.PI * 2, true);
      gameObj.ctxRader.fill();
    }
  }
};


//2つの物の距離を計算する関数
//引数として必要になるのは、潜水艦と対象アイテムのそれぞれのX座標とY座標、ゲーム全体の横幅と縦幅、画面に表示されているエリアの横幅と縦幅
function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight, raderCanvasWidth, raderCanvasHeight) {
  
  /* 
    今回のマップは地球のように端と端が繋がっている。
    なので、左右の両方から距離を計算し、より近かった距離が実際の距離になる。
    上下の距離においても同様。

    「raderCanvasWidth / 2」や「raderCanvasHeight / 2」は、ゲーム表示エリアの左下を原点とした場合の、
    それぞれ潜水艦のいる位置のX座標、Y座標を表す（潜水艦は表示エリアの中央に常に位置しているので）
  */
  
  let distanceX = 99999999;  //仮の値として設定(gameObj.fieldWidth以上の値なら何でもいいはず)
  let distanceY = 99999999;  //仮の値として設定(gameObj.fieldHeight以上の値なら何でもいいはず)
  let drawX = null;
  let drawY = null;

  if(pX <= oX) {

    //右方向での距離
    distanceX = oX - pX;
    drawX = (raderCanvasWidth / 2) + distanceX;

    //左方向での距離
    let tmpDistance = pX + gameWidth - oX;

    //右からの距離のほうが遠かった場合は、左からの距離を使用
    if(distanceX > tmpDistance) {
      distanceX = tmpDistance;
      drawX = (raderCanvasWidth / 2) - distanceX;
    }
  } else {

    //右方向での距離
    distanceX = pX - oX;
    drawX = (raderCanvasWidth / 2) - distanceX;

    //左方向での距離
    let tmpDistance = oX + gameWidth - pX;
    if(distanceX > tmpDistance) {
      distanceX = tmpDistance;
      drawX = (raderCanvasWidth / 2) + distanceX;
    }
  };

  //X座標の時と同じように求める
  if(pY <= oY) {

    //下方向での距離
    distanceY = oY - pY;
    drawY = (raderCanvasHeight / 2) + distanceY;

    //上方向での距離
    let tmpDistance = pY + gameHeight - oY;
    if(distanceY > tmpDistance) {
      distanceY = tmpDistance;
      drawY = (raderCanvasHeight / 2) - distanceY;
    }
  } else {

    //下方向での距離
    distanceY = pY - oY;
    drawY = (raderCanvasHeight / 2) - distanceY;

    //上方向での距離
    let tmpDistance = oY + gameHeight - pY;
    if(distanceY > tmpDistance) {
      distanceY = tmpDistance;
      drawY = (raderCanvasHeight / 2) + distanceY;
    }
  };

  //角度を求める
  const degree = calcTwoPointsDegree(drawX, drawY, raderCanvasWidth / 2, raderCanvasHeight / 2);

  //確認用
  //console.log(`distanceX: ${distanceX}, distanceY: ${distanceY}, drawX: ${drawX}, drawY: ${drawY}, degree: ${degree}`);

  return {
    distanceX,  //潜水艦と対象アイテムのX座標の差(絶対値)
    distanceY,  //潜水艦と対象アイテムのY座標の差(絶対値)
    drawX,  //ゲーム表示エリア内において、ゲーム表示エリア左下を原点とした場合の対象アイテムのX座標？
    drawY,  //ゲーム表示エリア内において、ゲーム表示エリア左下を原点とした場合の対象アイテムのY座標？
    degree
  };
};


//2点間の角度を求める関数（潜水艦から見た時のアイテムの角度を求める）
//潜水艦（原点扱い）と対象物を結んだ半直線と、正のX軸が作る角を求める
function calcTwoPointsDegree(x1, y1, x2, y2) {
  const radian = Math.atan2(y2 - y1, x2 - x1);
  const degree = radian * 180 / Math.PI +180;
  return degree;
};


//潜水艦のレーダーとアイテムとの角度の差を求める関数
//レーダーが通ったばかりのアイテムは距離が近く、徐々に反応が薄くなっていく少し特殊な差分計算
function calcDegreeDiffFromRader(degRader, degItem) {
  let diff = degRader - degItem;
  if(diff < 0) {
    diff += 360;
  }
  return diff;
};


//レーダーとの距離（角度の差）からアイテムを描画する時の透明度を計算する関数
//1が完全に透明で、0 ~ 1の値を設定
//レーダーとの距離（角度の差）の割合だけ1から引いていき、レーダーとの距離が無いとき1-1で透明度は0となる
//レーダーとの距離が270度以上なら、透明度1で消えるように
function calcOpacity(degreeDiff) {
  const deleteDeg = 270;
  degreeDiff = degreeDiff > deleteDeg ? deleteDeg : degreeDiff;
  return (1 - degreeDiff / deleteDeg).toFixed(2);
};


//キーボードで入力されたキーに応じて、潜水艦を方向転換させる関数
//jQueryの機能でキー入力があった場合に実行
$(window).on("keydown", (event) => {

  //gameObj.myPlayerObj変数がない場合(用意できていない場合)や、ゲームオーバの場合は処理を抜ける
  if(!gameObj.myPlayerObj || gameObj.myPlayerObj.isAlive === false) return;

  //入力があったキーによって処理を分岐
  /* 
    キーボードで入力された方向キーと、潜水艦の向きが同じ場合は何もせず、
    そうでない場合は、潜水艦の向きをキーボードで入力された方向に設定＆潜水艦を再描画し、
    サーバーに対して方向が変わったことを送信する
  */
  switch(event.key) {
    case 'ArrowLeft': 
      if (gameObj.myPlayerObj.direction === 'left') break;
      gameObj.myPlayerObj.direction = 'left';
      drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);
      sendChangeDirection(socket, 'left');
      break;
    case 'ArrowUp': 
      if (gameObj.myPlayerObj.direction === 'up') break;
      gameObj.myPlayerObj.direction = 'up';
      drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);
      sendChangeDirection(socket, 'up');
      break;
    case 'ArrowDown': 
      if (gameObj.myPlayerObj.direction === 'down') break;
      gameObj.myPlayerObj.direction = 'down';
      drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);
      sendChangeDirection(socket, 'down');
      break;
    case 'ArrowRight': 
      if (gameObj.myPlayerObj.direction === 'right') break;
      gameObj.myPlayerObj.direction = 'right';
      drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);
      sendChangeDirection(socket, 'right');
      break;
  }
});


//サーバに潜水艦の方向転換を送信する関数
function sendChangeDirection(socket, direction) {
  socket.emit('change direction', direction);
};