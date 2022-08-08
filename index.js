const Database = require("@replit/database")
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const request = require('request');
var fs = require('fs');

const db = new Database()

const app = express();
const server = http.Server(app);

const io = socketIo(server);

// 存在チェック
(async () => {
  let appStore = await db.get('store.application');
  if(appStore === null) {
    await db.set('store.application', [
      {
        name: 'test',
        user: 'system',
        githubLink: 'https://github.com/mf-3d/mf-3d'
      }
    ]);
  }
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`)
});

app.get('/tos', (req, res) => {
  res.sendFile(`${__dirname}/views/tos.html`)
});

app.get('/login', (req, res) => {
  res.redirect('https://bbs.mf7cli.potp.me/login?callback=https://update.mf7cli.tk/login/callback&appName=uniStore');
});

app.get('/login/callback', (req, res) => {
  res.send(`${req.query.user}さん、uniStoreへようこそ！`);
});

app.post('/api/v1/flune_browser/latest', (req, res) => {
  let ver_list = JSON.parse(fs.readFileSync(__dirname + '/ver_lists/flune.json', { encoding: 'utf-8' }));
  let latest_ver_index = ver_list.length - 1;

  ver_list.forEach((val, index) => {
    if (ver_list[latest_ver_index].isBeta || ver_list[latest_ver_index].isDev) {
      latest_ver_index--;
    }
  });

  res.json(ver_list[latest_ver_index]);
});

app.get('/store/applications', (req, res) => {
  res.sendFile(`${__dirname}/views/store.html`);
});

app.get('/store/applications/:userName/:appName', async (req, res) => {
  const rqt = (url) => {
    return new Promise((resolve, reject)=> {
      request(url, {
        method: 'GET',
        form: {
        }
      }, (error, response, body)=> {
        resolve(body);
      });
    });
  }

  let body = await rqt(`https://bbs.mf7cli.potp.me/api/v1/users/${req.params.userName}`);
  try {
    body = JSON.parse(body);
  } catch (e) {}
  
  if(body.error) {
    res.send('ユーザーが存在しません。');
    return;
  }
  
  if(await applicationCheck(req.params.appName)){
    res.sendFile(`${__dirname}/views/applicationPage.html`);
  } else {
    res.send('アプリケーションが存在しません。');
  }
});

server.listen(3000, () => {
  console.debug('サーバーが起動しました。')
});

io.on('connection', (socket) => {
  console.log('connected!');

  socket.on('start-up', async (data) => {
    console.log('start up.');
    if(data.location === 'store.application') {
      socket.emit('update-store', {
        location: 'store.application',
        store: await db.get('store.application')
      });
    }
  });
});

async function applicationCheck (name) {
  let storeApp = await db.get('store.application');
  let result = false;
  
  for (let i = 0; i < storeApp.length; i++) {
    if(storeApp[i].name === name) {
      result = true;
      break;
    }
  }

  return result;
}