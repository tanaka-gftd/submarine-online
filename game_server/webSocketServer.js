/* 潜水艦ゲームでのWebSocket通信で、サーバサイドの役割を果たす */


//WebSocketの待ち受けを開始する関数
function createWebSocketServer(io, game) {

  //WebSocketのNamespacesという通信のチャンネルを設定(/はデフォルト設定)
  const rootIo = io.of('/');

  //新しくWebSocketの接続が来た時に実行される処理
  rootIo.on('connection', (socket) => {
    
    //接続したユーザから送られてくるtwitterアカウント名とサムネイルURLを取得し変数に格納
    const displayName = socket.handshake.query.displayName;
    const thumbUrl = socket.handshake.query.thumbUrl;

    console.log('WebSocketのコネクションがありました。');  //ターミナルでの確認用

    //WebSocketの通信ID,表示名,サムネイル画像のURLの３種をまとめたオブジェクトに、start data という名前をつけて送信
    //game.newConnectionは、プレイヤーが新たにゲームに参加した時に実行する関数として、別で実装しておく
    const startObj = game.newConnection(socket.id, displayName, thumbUrl);
    socket.emit('start data', startObj);

    //ユーザが接続を切断をした時に実行
    socket.on('disconnect', () => {
      //game.disconnectは、プレイヤーが接続を切った時に実行する関数として、別で実装
      game.disconnect(socket.id);
    });
  });

  //66ミリ秒ごとに、作成したマップデータにmap dataという名前をつけて送信
  //volatile.emit...クライアントにデータが届いたどうかを確認しない送信方法。すぐに消える揮発性メッセージを送る。高頻度な通信を行う際に便利
  const socketTicker = setInterval(() => {
    rootIo.volatile.emit('map data', game.getMapData());  //game.getMapDataはマップデータを作成する関数（別で実装）
  },
  66);
};

//いつものようにエキスポート
module.exports = {
  createWebSocketServer
};
