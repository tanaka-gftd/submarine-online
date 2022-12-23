/* 各種設定を記載するファイル */
/* Twitterと連携したログインを行う場合は、このファイルにTwitterのAPIキーなどを記載してエキスポートする（今回は行わない） */


const url = process.env.PRODUCTION_URL || 'http://localhost:8000';

module.exports = {
  /* 開発用ページのURLもここに記載しておくと、修正しやすく便利 */
  ipAddress: url
  //ipAddress: 'https://tanaka-submarine-online.onrender.com'
};