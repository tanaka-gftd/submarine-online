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

    //start data という名前のデータを送信する
    socket.emit('start data', {});

    //ユーザが接続を切断をした時に実行
    socket.on('disconnect', () => {});
  });

  //66ミリ秒ごとに、map dataという名前のデータを送信
  //volatile.emit...クライアントにデータが届いたどうかを確認しない送信方法。高頻度な通信を行う際に便利
  const socketTicker = setInterval(() => {
    rootIo.volatile.emit('map data', {});
  },
  66);
};

//いつものようにエキスポート
module.exports = {
  createWebSocketServer
};
