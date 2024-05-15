const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
var { createProxyMiddleware } = require("http-proxy-middleware");
let axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
let jwt = require("jsonwebtoken");
require('dotenv').config();

// const instance = axios.create({
//   httpsAgent: new https.Agent({
//     rejectUnauthorized: false,
//   }),
// });

const options = {
  key: fs.readFileSync(path.join(__dirname, "certs", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs", "cert.pem")),
};

const port = 9998;
const secretKey = process.env.SECRET_KEY;

const app = express();

const server = https.createServer(options, app)

server.listen(port, () => {
  console.log(`五子棋游戏已启动：https://localhost:${port}`);
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.use(cors());


// 检查AccessToken是否有效
app.get("/checkLogin", (req, res) => {
  let token = req.headers.authorization;
  jwt.verify(token, secretKey, (err,payload) => {
    if (err) {
      res.send({
        code: 1,
        msg: "AccessToken无效"+err,
      });
    } else {
      res.send({
        code: 0,
        data: {
          msg: "AccessToken有效，用户已登录",
        },
      });
    }
  });
});

app.post("/checkUser", (req, res) => {
  let {token1,token2} = req.body;
  jwt.verify(token1, secretKey, (err,payload1) => {
    if (err) {
      res.send({
        code: 1,
        msg: "验证失败",
      });
    } else {
      jwt.verify(token2, secretKey, (err,payload2) => {
        if (err) {
          res.send({
            code: 1,
            msg: "验证失败",
          });
        } else {
          if ((payload1.username === payload2.username && payload1.username!=='undefined') || (payload1.phone === payload2.phone && payload1.phone!=='undefined')) {
            res.send({
              code: 0,
              msg: "允许退出",
            });
          } else {
            res.send({
              code: 1,
              msg: "不允许退出",
            });
          }
        }
      });
    }
  });
});