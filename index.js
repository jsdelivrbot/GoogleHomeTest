// モジュールのインポート
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

// 開発で使うポート番号
const LOCAL_PORT_NUMBER = 5000;

// ----初期化と設定----
var app = express();
app.set('port', (process.env.PORT || LOCAL_PORT_NUMBER));
app.set('x-powered-by', false);
app.set('case sensitive routing', true);
app.set('strict routing', true);
app.use(bodyParser.json());

// VerbalistのFulfillment
app.post('/google_home/verbalist', function (req, res, next) {
  console.log('=====[REQUEST]====');
  console.log(req.body);

  // リクエストに必要なパラメータが含まれていない場合は、以降の処理を中止する
  if (!req.body || !req.body.result || !req.body.result.parameters) {
    return res.status(400).send('No parameters.');
  }

  // タスクの内容を取得する
  var task = req.body.result.parameters.task;
  console.log('=====[TASK]====');
  console.log(task);
  // 単語が半角スペースで区切られているのでそれを削除
  var trimmedTask = task.replace(/ /g, '');

  // 予定日時を取得する(JSTをUTCに変換する)
  var jstDateTime = Date.parse(req.body.result.parameters.date);
  var utcDate = new Date(jstDateTime - 1000 * 60 * 60 * 9);
  console.log(utcDate);

  var options = {
    // MEMO: TOKENは適当な文字列を入れてください
    uri: 'https://beta.todoist.com/API/v8/tasks?token=' + TOKEN,
    headers: {
      'Content-type': 'application/json',
    },
    json: {
      'content': trimmedTask,
      'due_datetime': utcDate
    }
  };

  // POSTする
  request.post(options, function (error, response, body) {
    // 返答内容
    var speech;
    // (ディスプレイがあれば)ディスプレイに表示する内容
    var displayText;

    if (error) {
      console.log('=====[ERROR]====');
      console.log(error);

      speech = 'タスクの追加に失敗しました。';
      displayText = 'タスクの追加に失敗しました。';
    } else {
      console.log('=====[BODY]====');
      console.log(body);

      speech = 'タスク、' + body.content + '、を追加しました。';
      displayText = 'タスク名：' + body.content + '\n' + '予定日時：' + body.due.datetime;
    }

    // レスポンスを送る
    res.json({
      source: 'add_task',
      speech: speech,
      displayText: displayText
    });
  });
});

// 第一引数にポート番号、第二引数にコールバック関数を指定して、サーバを起動
var server = app.listen(app.get('port'), function () {
  console.log('http server is running...');

  // すでに終了しているかどうかのフラグ
  var isFinished = false;

  process.on('SIGTERM', () => {
    // すでに終了している場合は何もしない
    if (isFinished) {
      return;
    }
    isFinished = true;

    console.log('http server is closing...');

    // サーバを停止する
    server.close(function () {
      console.log('http server closed.');

      // 正常終了
      process.exit(0);
    });
  });
});

// サーバのエラーを監視する
server.on('error', function (err) {
    console.error(err);

    // 異常終了
    process.exit(1);
});