/* 各種設定を記載するファイル */
/* Twitterと連携したログインを行う場合は、このファイルにTwitterのAPIキーなどを記載してエキスポートする（今回は行わない） */


/* PRODUCTION_URLが存在するなら、そちらを用い、存在しないなら開発用URLを使用する */
/* PRODUCTION_URLは、renderのDashboardより環境変数として設定しておく */
const url = process.env.PRODUCTION_URL || 'http://localhost:8000';

module.exports = {
  ipAddress: url
};