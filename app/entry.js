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
  raderCanvasWidth: 500,  //レーダーに表示できる横幅(ゲームエリアに表示されるエリアの横幅) 
  raderCanvasHeight: 500,  //レーダーに表示できる縦幅(ゲームエリアに表示されるエリアの縦幅)
  /* 潜水艦は常にゲームエリアの中心にいるので、潜水艦からゲームエリアの端までは raderCanvasWidth/2 と raderCanvasHeight/2 となる*/

  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  itemRadius: 4,  //ミサイルアイテムの大きさ（円で描画するので半径）を設定
  airRadius: 5,  //酸素アイテムの大きさ（円で描画するので半径）を設定
  bomCellPx: 32,  //爆発のリスト画像のうち、一つ分のサイズ
  deg: 0,
  counter: 0,  //カウント用変数
  rotationDegreeByDirection: {  //潜水艦の画像の描画する向き(角度は時計回り？)
    'left': 0,  //左方向は別で定義(180にすると、上下が反転してしまうので)
    'up': 270,  //上向き
    'down': 90,  //下向き
    'right': 0  //右向き（初期値）
  },
  rotationDegreeByFlyingMissileDirection: {  //ミサイルを描画する角度
    'left': 270,
    'up': 0,
    'down': 180,
    'right': 90
  },
  myDisplayName: $('#main').attr('data-displayName'),  //data-*でグローバル変数として設定
  myThumbUrl: $('#main').attr('data-thumbUrl'),  //data-*でグローバル変数として設定
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  airMap: new Map(),
  flyingMissilesMap: new Map(),  //ゲーム内で発射されたミサイルの情報を格納するmap(フロント用)
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

  //ミサイルの画像
  gameObj.missileImage = new Image();
  gameObj.missileImage.src = '/images/missile.png';

  //爆発の画像集
  gameObj.bomListImage = new Image();
  gameObj.bomListImage.src = '/images/bomlist.png';
};

init();


//キャンバスの中身を削除 → レーダーを描画、潜水艦を描画、クライアントでも潜水艦とミサイルを動かす、という処理
//クライアントでも潜水艦とミサイルを動かせば、サーバとの通信が遅れてもスムーズに動作しているように見せることが可能となる
function ticker() {

  //サーバからデータを受けっとていないときは、マップを描画しない(if文を簡略化して記述してます)
  if (!gameObj.myPlayerObj || !gameObj.playersMap) return;  

  gameObj.ctxRader.clearRect(0, 0, gameObj.raderCanvasWidth, gameObj.raderCanvasHeight);  //ゲーム用のキャンバスの中身を削除
  drawRader(gameObj.ctxRader);  //レーダーを描画
  drawMap(gameObj);  //マップを描画
  drawSubmarine(gameObj.ctxRader, gameObj.myPlayerObj);  //潜水艦を描画

  //酸素残量０、もしくは、敵に爆破された時、ゲームオーバーの文字をプレイヤーに提示する
  if(gameObj.myPlayerObj.isAlive === false && gameObj.myPlayerObj.deadCount > 60) {
    drawGameOver(gameObj.ctxRader);
  };

  //スコアエリアに表示する、酸素残量とミサイルアイコン
  gameObj.ctxScore.clearRect(0, 0, gameObj.scoreCanvasWidth, gameObj.scoreCanvasHeight);
  drawAirTimer(gameObj.ctxScore, gameObj.myPlayerObj.airTime);
  drawMissiles(gameObj.ctxScore, gameObj.myPlayerObj.missilesMany);
  drawScore(gameObj.ctxScore, gameObj.myPlayerObj.score);
  drawRanking(gameObj.ctxScore, gameObj.playersMap, gameObj.myPlayerObj);

  //潜水艦とミサイルの動きはシンプルなので、フロントでも動かせるようにする
  moveInClient(gameObj.myPlayerObj, gameObj.flyingMissilesMap);

  //tickerが実行されるたびに1つ増やし、10000を超えたら0にリセット、そしてまたticker実行ごとに1つずつ増やす
  gameObj.counter = (gameObj.counter + 1) % 10000;
};

//ticker関数を、33ミリ秒ごとに実行
setInterval(ticker, 33);

function drawGameOver(ctxRader) {
  ctxRader.font = 'bold 76px arial black';
  ctxRader.fillStyle = "rgb(255, 20, 20)";
  ctxRader.fillText('Game Over', 20, 270);
  ctxRader.strokeStyle = "rgb(0, 0, 0)";
  ctxRader.lineWidth = 3;
  ctxRader.strokeText('Game Over', 20, 270);
};


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

  //爆発アニメーション
  if(myPlayerObj.isAlive === false) {
    drawBom(ctxRader, gameObj.raderCanvasWidth / 2, gameObj.raderCanvasHeight / 2, myPlayerObj.deadCount);
    return;
  }

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


//爆発アニメーションを表示する関数
function drawBom(ctxRader, drawX, drawY, deadCount) {
  if(deadCount >= 60) return;

  //6カウントごとに表示する爆発画像を入れ替えていくようにする
  //爆発のリスト画像の中身を、一つずつ左上〜右上〜左下〜右下の順に表示していくようにする
  const drawBomNumber = Math.floor(deadCount / 6);
  const cropX = (drawBomNumber % (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;
  const cropY = Math.floor(drawBomNumber / (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;

  ctxRader.drawImage(
    gameObj.bomListImage,
    cropX, cropY,
    gameObj.bomCellPx, gameObj.bomCellPx,
    drawX - gameObj.bomCellPx / 2, drawY - gameObj.bomCellPx / 2,
    gameObj.bomCellPx, gameObj.bomCellPx
  );
};


//スコアエリアに表示するミサイルアイコン(所持数によって数が変化するようにする)
function drawMissiles(ctxScore, missilesMany) {
  for(let i = 0; i < missilesMany; i++){
    ctxScore.drawImage(gameObj.missileImage, 50 * i, 80);
  }
};


//img要素を保持するためのmapを用意
//img要素を保持しておくことで、img要素の再作成によるチラつきを回避できる
//gameObjにthumbsMapがあればそのまま使い、なければ新規にmapを作成
gameObj.thumbsMap = gameObj.thumbsMap ?? new Map();


//スコアエリアに表示する酸素量(残量は水色の数字で表示)
function drawAirTimer(ctxScore, airTime) {
  ctxScore.fillStyle = "rgb(26, 26, 26)";
  ctxScore.font = '24px Arial';
  ctxScore.fillText(`残り酸素量: ${airTime}`, 10, 50);
};


//自分のスコアを表示
function drawScore(ctxScore, score) {
  ctxScore.fillStyle = "rgb(26, 26, 26)";
  ctxScore.font = 'bold 28px Arial';
  ctxScore.fillText(`score: ${score}`, 10, 180);
};


//スコアのランキング表示
function drawRanking(ctxScore, playersMap, myPlayerObj) {

  //playersMapを配列化し、空配列と結合することで、新規の配列を作成
  //concatメソッド...2つ以上の配列を結合する。既存の配列を変更せずに新しい配列を返す
  const playersArray = [].concat(Array.from(playersMap));

  //scoreの値を元にソート
  playersArray.sort((a, b) => b[1].score - a[1].score);

  //ランキングエリアの横線
  ctxScore.fillStyle = "rgb(26, 26, 26)";
  ctxScore.fillRect(0, 220, gameObj.scoreCanvasWidth, 3);

  //ランキングを生成していく
  //twitterログインを行った場合は、twitterアカウントの画像も表示する
  for(let i = 0; i < 10; i++) {
    if(!playersArray[i]) return;

    ctxScore.font = '20px Arial';

    const rank = i + 1;
    const x = 10, y = 220 + (rank * 26);

    //プレイヤーの情報から、ランキング生成に必要なものを取り出す
    const {playerId, thumbUrl, displayName, score} = playersArray[i][1];

    //自分のスコアは青色、自分以外のスコアは黒色で表示
    if(playerId === myPlayerObj.playerId){
      ctxScore.fillStyle = "rgb(26, 26, 255)";
    } else {
      ctxScore.fillStyle = "rgb(26, 26, 26)";
    };

    //プロフィール画像が存在する(twitterログイン済み)場合の処理
    if(/twimg\.com/.test(thumbUrl)) {  //画像がTwitterのものかをURLをもとに判定

      const thumbWidth = 20, thumbHeight = 20;
      const rankWidth = ctxScore.measureText(`${rank}th`).width;

      let thumb = null;

      //gameObj.thumbsMapにimg要素がある場合は取得して描画、存在しないなら新たに作成＆追加して描画
      if(gameObj.thumbsMap.has(playerId)) {
        thumb = gameObj.thumbsMap.get(playerId);
        draw();
      } else {
        thumb = new Image();
        thumb.src = thumbUrl;
        thumb.onload = draw;
        gameObj.thumbsMap.set(playerId, thumb);
      };

      //画像付きのランキングを描画する処理を切り出しておく
      function draw() {
        ctxScore.fillText(`${rank}th`, x, y);
        ctxScore.drawImage(thumb, x + rankWidth, y - thumbHeight, thumbWidth, thumbHeight);
        ctxScore.fillText(`${displayName} ${score}`, x + rankWidth + thumbWidth, y);
      };
      continue;  //描画したら次のループへ
    }
    //プロフィール画像がない場合(ゲストユーザー、NPC)の処理
    ctxScore.fillText(`${rank}th ${displayName} ${score}`, x, y);
  }
};


/* 
  socket.on('イベント名', 関数) でWebSocketデータを受信した時の処理を実装。

  Socket.IO で行う通信は通信に名前が付いており、
  socket.on('start data', (startObj) => {} は start data という名前のデータを受け取ったときに実行される
*/
//フロントでの描画のために、WebSocketサーバから受け取った値(ゲームの横幅と縦幅、プレイヤー情報)を保存
socket.on('start data', (startObj) => {

  //引数で受け取ったオブジェクトから、各値を取り出す
  /* 
  引数で受け取ったオブジェクトの中身
    {
      fieldWidth: gameObj.fieldWidth,
      fieldHeight: gameObj.fieldHeight,
      submarineSpeed: gameObj.submarineSpeed,
      missileSpeed: gameObj.missileSpeed
    }
  */ 
 gameObj.fieldWidth = startObj.fieldWidth;  //ゲームの横幅
  gameObj.fieldHeight = startObj.fieldHeight;  //ゲームの縦幅
  gameObj.myPlayerObj = startObj.playerObj;  //プレイヤーデータを持ったオブジェクト
  gameObj.submarineSpeed = startObj.submarineSpeed;  //潜水艦の速度
  gameObj.missileSpeed = startObj.missileSpeed;  //ミサイルの速度
});


//socket.on('map data', (compressed) => {} は map data という名前のデータを受け取ったときに実行される
//フロントでの描画のために、WebSocketサーバから受け取った値(ゲームの現在の状態、ミサイルアイテムの座標、酸素アイテムの座標、発射されたミサイルの情報)を保存、更新
socket.on('map data', (compressed) => {

  /* 
    引数として受け取るのは2重配列 構造 → [playersArray, itemsArray, airArray]
    playersArray...参加プレイヤーの各情報を格納した配列
    itemsArray...ミサイルアイテムの座標を格納した配列
    airArray...酸素アイテムの座標を格納した配列
    flyingMissilesArray...発射されたミサイルの座標と進行方向、及び、発射したプレイヤーのIDを格納した配列
  */
  const playersArray = compressed[0];
  const itemsArray = compressed[1];
  const airArray = compressed[2];
  const flyingMissilesArray = compressed[3];

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
    player.missilesMany = compressedPlayerData[7];
    player.airTime = compressedPlayerData[8];
    player.deadCount = compressedPlayerData[9];
    player.thumbUrl = compressedPlayerData[10];

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
      gameObj.myPlayerObj.missilesMany = compressedPlayerData[7];
      gameObj.myPlayerObj.airTime = compressedPlayerData[8];
      gameObj.myPlayerObj.deadCount = compressedPlayerData[9];
      gameObj.myPlayerObj.thumbUrl = compressedPlayerData[10];
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

  //ミサイルの座標や進行方向、発射したプレイヤーのIDを格納したmapを、gameObjに追加
  gameObj.flyingMissilesMap = new Map();
  flyingMissilesArray.forEach((compressedFlyingMissileData, index) => {
    gameObj.flyingMissilesMap.set(index, {
      x: compressedFlyingMissileData[0],
      y: compressedFlyingMissileData[1],
      direction: compressedFlyingMissileData[2],
      emitPlayerId: compressedFlyingMissileData[3]
    });
  });
});


//角度をラジアンに変換する関数
//「角度 * π / 180」という計算式で、ラジアンに変換できる
function getRadian(deg) {
  return deg * Math.PI /180;
};


//マップを描画する関数
function drawMap(gameObj) {

  //敵プレイヤーとNPCの描画
  //参加プレイヤー全員を描画するので、for文でループ
  for(let [key, enemyPlayerObj] of gameObj.playersMap) {
    if(key === gameObj.myPlayerObj.playerId) {continue;}  //自分自身は他プレイヤーとして描画しない

    //自機と敵機の距離を求める
    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      enemyPlayerObj.x, enemyPlayerObj.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.raderCanvasWidth, gameObj.raderCanvasHeight
    );

    //描画する敵機は、自機との距離がifの条件文を満たすものだけにする
    if(distanceObj.distanceX <= (gameObj.raderCanvasWidth / 2) && distanceObj.distanceY <= (gameObj.raderCanvasHeight / 2)) {
      
      //ゲームオーバ時の処理
      //ゲームオーバーの文字を表示させ、continueで次のプレイヤーの処理に移行する
      if(enemyPlayerObj.isAlive === false) {
        drawBom(gameObj.ctxRader, distanceObj.drawX, distanceObj.drawY, enemyPlayerObj.deadCount);
        continue
      };

      const degreeDiff = calcDegreeDiffFromRader(gameObj.deg, distanceObj.degree);
      const toumeido = calcOpacity(degreeDiff);

      //4重円を作成して、それぞれに透明度や色を設定することで、レーダー内の敵機を波紋のようなアニメーションで表示する
      const drawRadius = gameObj.counter % 12 + 2 + 12;
      const clearRadius = drawRadius - 2;
      const drawRadius2 = gameObj.counter % 12 + 2;
      const clearRadius2 = drawRadius2 - 2;

      gameObj.ctxRader.fillStyle = `rgba(0, 0, 255, ${toumeido})`;
      gameObj.ctxRader.beginPath();
      gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, drawRadius, 0, Math.PI * 2, true);
      gameObj.ctxRader.fill();

      gameObj.ctxRader.fillStyle = `rgb(0, 20, 50)`;
      gameObj.ctxRader.beginPath();
      gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, clearRadius, 0, Math.PI * 2, true);
      gameObj.ctxRader.fill();

      gameObj.ctxRader.fillStyle = `rgba(0, 0, 255, ${toumeido})`;
      gameObj.ctxRader.beginPath();
      gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI * 2, true);
      gameObj.ctxRader.fill();

      gameObj.ctxRader.fillStyle = `rgb(0, 20, 50)`;
      gameObj.ctxRader.beginPath();
      gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI * 2, true);
      gameObj.ctxRader.fill();

      //他プレイヤー名の表示方法を設定(プレイヤー名表示処理の共通部分を抜き出して関数化)
      function showEnemyName() {
        gameObj.ctxRader.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
        gameObj.ctxRader.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.moveTo(distanceObj.drawX, distanceObj.drawY);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 20, distanceObj.drawY - 20);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 20 + 40, distanceObj.drawY - 20);
        gameObj.ctxRader.stroke();
        gameObj.ctxRader.font = '16px Arial';
      };

      //他プレイヤー名を表示していく
      //他ユーザーがTwitterログインを行っていない場合と、行っている場合で分岐
      //行っていないユーザーはanonymous、行っている場合はTwitterアカウント名で表示する
      if(enemyPlayerObj.displayName === 'ゲストユーザー') {
        showEnemyName();
        gameObj.ctxRader.fillText('anonymous', distanceObj.drawX + 20, distanceObj.drawY - 20 - 1);
      } else if (enemyPlayerObj.displayName) {
        showEnemyName();
        gameObj.ctxRader.fillText(enemyPlayerObj.displayName, distanceObj.drawX + 20, distanceObj.drawY - 20 -1);
      }
    }
  }

  /* 「それぞれのMapに格納された情報から適切な点を描画する」という処理は共通化できるので、関数drawObjにまとめた */
  drawObj(gameObj.itemsMap, 255, 165, 0);
  drawObj(gameObj.airMap, 0, 220, 225);

  //飛んでいるミサイルの描画
  //全ての発射されたミサイルを表示するので、for文で回す
  //ミサイルの表示するコードは、基本的な部分は潜水艦の表示と同じ
  for(let [missileId, flyingMissile] of gameObj.flyingMissilesMap) {

    //自機とミサイルの距離を求めて保存
    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x, gameObj.myPlayerObj.y,
      flyingMissile.x, flyingMissile.y,
      gameObj.fieldWidth, gameObj.fieldHeight,
      gameObj.raderCanvasWidth, gameObj.raderCanvasHeight
    );

    //描画するミサイルは、自機との距離が一定以下のものだけにする
    if (distanceObj.distanceX <= (gameObj.raderCanvasWidth / 2 + 50) && distanceObj.distanceY <= (gameObj.raderCanvasHeight / 2 + 50)) {

      //自分が発射したミサイルを描画
      //自分が発射したミサイルは画像で表示する
      if (flyingMissile.emitPlayerId === gameObj.myPlayerObj.playerId) {

        const rotationDegree = gameObj.rotationDegreeByFlyingMissileDirection[flyingMissile.direction];
        gameObj.ctxRader.save();
        gameObj.ctxRader.translate(distanceObj.drawX, distanceObj.drawY);
        gameObj.ctxRader.rotate(getRadian(rotationDegree));
        gameObj.ctxRader.drawImage(
          gameObj.missileImage, -gameObj.missileImage.width / 2, -gameObj.missileImage.height / 2
        );
        gameObj.ctxRader.restore();
        gameObj.ctxRader.strokeStyle = "rgba(250, 250, 250, 0.9)";
        gameObj.ctxRader.fillStyle = "rgba(250, 250, 250, 0.9)";
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.moveTo(distanceObj.drawX, distanceObj.drawY);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 20, distanceObj.drawY - 20);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 20 + 35, distanceObj.drawY - 20);
        gameObj.ctxRader.stroke();

        gameObj.ctxRader.font = '16px Arial';
        gameObj.ctxRader.fillText('ミサイル', distanceObj.drawX + 20, distanceObj.drawY - 20 - 2);

      } else {  //他プレイヤーが発射したミサイルを描画(他プレイヤーのミサイルは危険信号のように赤い波紋で表示する)
        const degreeDiff = calcDegreeDiffFromRader(gameObj.deg, distanceObj.degree);
        const toumeido = calcOpacity(degreeDiff);

        const drawRadius1 = gameObj.counter % 8 + 2 + 20;
        const clearRadius1 = drawRadius1 - 2;
        const drawRadius2 = gameObj.counter % 8 + 2 + 10;
        const clearRadius2 = drawRadius2 - 2;
        const drawRadius3 = gameObj.counter % 8 + 2 + 0;
        const clearRadius3 = drawRadius3 - 2;

        gameObj.ctxRader.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, drawRadius1, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.fillStyle = "rgb(0, 20, 50)";
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, clearRadius1, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.fillStyle = "rgb(0, 20, 50)";
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, drawRadius3, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.fillStyle = "rgb(0, 20, 50)";
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.arc(distanceObj.drawX, distanceObj.drawY, clearRadius3, 0, Math.PI * 2, true);
        gameObj.ctxRader.fill();

        gameObj.ctxRader.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
        gameObj.ctxRader.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
        gameObj.ctxRader.beginPath();
        gameObj.ctxRader.moveTo(distanceObj.drawX, distanceObj.drawY);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 30, distanceObj.drawY - 30);
        gameObj.ctxRader.lineTo(distanceObj.drawX + 30 + 35, distanceObj.drawY - 30);
        gameObj.ctxRader.stroke();

        gameObj.ctxRader.font = '16px Arial';
        gameObj.ctxRader.fillText('danger!!', distanceObj.drawX + 30, distanceObj.drawY - 30 - 2);
      }
    }
  }
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


//キーボードで入力されたキーに応じて、潜水艦を方向転換、ミサイルを発射させる関数
//jQueryの機能でキー入力があった場合に実行
$(window).on("keydown", (event) => {

  //gameObj.myPlayerObj変数がない場合(用意できていない場合)や、ゲームオーバの場合は処理を抜ける
  if(!gameObj.myPlayerObj || gameObj.myPlayerObj.isAlive === false) return;

  //入力があったキーによって処理を分岐（潜水艦の方向転換、ミサイルの発射）
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
    case ' ':  //ミサイルの発射はスペースキー
      if(gameObj.myPlayerObj.missilesMany <= 0) break;  //ミサイルのストックが0

      gameObj.myPlayerObj.missilesMany -= 1;

      //クライアントだけでもミサイルを描画＆移動できるように、擬似的なミサイルデータを作成して、gameObjに追加
      const missileId = Math.floor(Math.random() * 100000) + ',' + gameObj.myPlayerObj.socketId + ',' + gameObj.myPlayerObj.x + ',' + gameObj.myPlayerObj.y;
      const missileObj = {
        emitPlayerId: gameObj.myPlayerObj.playerId,
        x: gameObj.myPlayerObj.x,
        y: gameObj.myPlayerObj.y,
        direction: gameObj.myPlayerObj.direction,
        id: missileId
      };
      gameObj.flyingMissilesMap.set(missileId, missileObj);

      //サーバにミサイル発射を通知
      sendMissileEmit(socket, gameObj.myPlayerObj.direction);
      break;
  }
});


//サーバに潜水艦の方向転換を送信する関数
function sendChangeDirection(socket, direction) {
  socket.emit('change direction', direction);
};


//サーバにミサイルを発射したことを送信
function sendMissileEmit(socket, direction) {
  socket.emit('missile emit', direction);
};


//クライアント側だけでも自機やミサイルを移動させる関数
/* 
  これを実装することにより、ユーザーに対して、通信状態が悪い場合でも快適に動作しているように見せることができる。
  コード自体はサーバで座標を更新している実装と同じ。
*/
function moveInClient(myPlayerObj, flyingMissilesMap, gameObj) {

  //敵にやられてからの時間(爆発アニメーション用)
  if (myPlayerObj.isAlive === false) {
    if (myPlayerObj.deadCount < 60) {
      myPlayerObj.deadCount += 1;
    }
    return;
  }

  //自機の移動
  switch (myPlayerObj.direction) {
    case 'left':
      myPlayerObj.x -= gameObj.submarineSpeed;
      break;
    case 'up':
      myPlayerObj.y -= gameObj.submarineSpeed;
      break;
    case 'down':
      myPlayerObj.y += gameObj.submarineSpeed;
      break;
    case 'right':
      myPlayerObj.x += gameObj.submarineSpeed;
      break;
  }

  //画面端で反対側にループするよう、自機の座標を修正
  if(myPlayerObj.x > gameObj.fieldWidth) myPlayerObj.x -= gameObj.fieldWidth;
  if(myPlayerObj.x < 0) myPlayerObj.x += gameObj.fieldWidth;
  if(myPlayerObj.y < 0) myPlayerObj.y += gameObj.fieldHeight;
  if(myPlayerObj.y > gameObj.fieldHeight) myPlayerObj.y -= gameObj.fieldHeight;

  //生存時間を計測
  myPlayerObj.aliveTime.clock += 1;
  if(myPlayerObj.aliveTime.clock === 30) {
    myPlayerObj.aliveTime.clock = 0;
    myPlayerObj.aliveTime.seconds += 1;
  }

  //発射されている全てのミサイルの移動(for文で回す)
  for(let [missileId, flyingMissile] of flyingMissilesMap) {
    switch(flyingMissile.direction) {
      case 'left':
        flyingMissile.x -= gameObj.missileSpeed;
        break;
      case 'up':
        flyingMissile.y -= gameObj.missileSpeed;
        break;
      case 'down':
        flyingMissile.y += gameObj.missileSpeed;
        break;
      case 'right':
        flyingMissile.x += gameObj.missileSpeed;
        break;
    }

    //画面端で反対側にループするよう、ミサイルの座標を修正
    if(flyingMissile.x > gameObj.fieldWidth) flyingMissile.x -= gameObj.fieldWidth;
    if(flyingMissile.x < 0) flyingMissile.x += gameObj.fieldWidth;
    if(flyingMissile.y < 0) flyingMissile.y += gameObj.fieldHeight;
    if(flyingMissile.y > gameObj.fieldHeight) flyingMissile.y -= gameObj.fieldHeight;
  }
};