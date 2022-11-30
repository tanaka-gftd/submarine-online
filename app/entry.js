'use strict';

//jQueryを導入、$に格納（以降、本ファイルの$はjQueryライブラリが入っています）
import $ from 'jquery';

/* 
  canvasタグについて
  https://developer.mozilla.org/ja/docs/Web/API/Canvas_API
*/

/* 
  キャンバス全体を削除　（参考）https://developer.mozilla.org/ja/docs/Web/API/CanvasRenderingContext2D/clearRect
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
*/

//ゲームで扱う値を、オブジェクトで設定
const gameObj = {
  raderCanvasWidth: 500,
  raderCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),  //data-*でグローバル変数として設定
  myThumbUrl: $('#main').attr('data-thumbUrl')  //data-*でグローバル変数として設定
};


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


//角度をラジアンに変換する関数
//「角度 * π / 180」という計算式で、ラジアンに変換できる
function getRadian(deg) {
  return deg * Math.PI /180;
};