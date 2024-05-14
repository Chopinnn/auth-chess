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

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const options = {
  key: fs.readFileSync(path.join(__dirname, "certs", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs", "cert.pem")),
};

const port = 9998;
const appId = "9998";
const secretKey = process.env.SECRET_KEY;
const app = express();
https.createServer(options, app).listen(port, () => {
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