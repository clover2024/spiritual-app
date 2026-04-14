const crypto = require('crypto');
const http = require('http');

// 微信公众号配置（从环境变量读取）
const APPID = process.env.WX_APPID || '';
const APPSECRET = process.env.WX_APPSECRET || '';
const PORT = process.env.PORT || 3000;

// 缓存
let tokenCache = { value: '', expire: 0 };
let ticketCache = { value: '', expire: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && now < tokenCache.expire) {
    return tokenCache.value;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) throw new Error(`getAccessToken failed: ${data.errmsg}`);
  tokenCache = { value: data.access_token, expire: now + (data.expires_in - 300) * 1000 };
  return data.access_token;
}

async function getJsApiTicket() {
  const now = Date.now();
  if (ticketCache.value && now < ticketCache.expire) {
    return ticketCache.value;
  }
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`getTicket failed: ${data.errmsg}`);
  ticketCache = { value: data.ticket, expire: now + (data.expires_in - 300) * 1000 };
  return data.ticket;
}

function sign(ticket, nonceStr, timestamp, url) {
  const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  return crypto.createHash('sha1').update(str).digest('hex');
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache',
};

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, HEADERS);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, HEADERS);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Sign endpoint: /wx-sign?url=xxx
  if (req.url.startsWith('/wx-sign')) {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const url = params.get('url') || '';

    if (!url) {
      res.writeHead(400, HEADERS);
      res.end(JSON.stringify({ error: 'missing url parameter' }));
      return;
    }

    try {
      const ticket = await getJsApiTicket();
      const nonceStr = Math.random().toString(36).slice(2, 15);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = sign(ticket, nonceStr, timestamp, url);

      res.writeHead(200, HEADERS);
      res.end(JSON.stringify({ appId: APPID, timestamp, nonceStr, signature }));
    } catch (err) {
      res.writeHead(500, HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, HEADERS);
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`WX Sign server running on port ${PORT}`);
});
