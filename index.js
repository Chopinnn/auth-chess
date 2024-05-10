const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
var { createProxyMiddleware } = require("http-proxy-middleware");
let axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

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
const app = express();
https.createServer(options, app).listen(port, () => {
  console.log(`五子棋游戏已启动：https://localhost:${port}`);
});

app.use(cookieParser());
app.use(express.static("public"));
app.use(cors());

app.get("/checkLogin", (req, res) => {
  // 通过共享cookie中的token去验证是否登录
  if (req.cookies["SSO-Cookie"]) {
    instance
      .post("https://localhost:3000/cas/checkLogin", {
        token: req.cookies["SSO-Cookie"],
      })
      .then((response) => {
        if (response.data.code === 1) {
          res.send({
            code: 1,
            msg: "未登录",
          });
        } else {
          res.send({
            code: 0,
            data: {
              msg: "已登录，token有效",
            },
          });
        }
      });
  } else {
    console.log("有cookie");
    res.send({
      code: 1,
      msg: "未登录",
    });
  }
});

app.get("/logout", (req, res) => {
  instance
    .get("https://localhost:3000/cas/logout", {
      headers: {
        Authorization: req.cookies["SSO-Cookie"],
      },
    })
    .then((response) => {
      if (response.data.code === 0) {
        res.cookie("SSO-Cookie", "", { maxAge: 0 });
        res.send({
          code: 0,
          data: {
            msg: "退出成功",
          },
        });
      } else if (response.data.code === 1) {
        res.send({
          code: 1,
          msg: response.data.msg,
        });
      } else {
        res.send({
          code: 2,
          msg: response.data.msg,
        });
      }
    })
    .catch((err) => {
      res.send({
        code: 1,
        msg: "退出失败",
      });
    });
});

app.get("/test", (req, res) => {
  // 先获取csrfToken
  instance
    .get("https://localhost:3000/cas/csrfToken")
    .then((response) => {
      let csrfToken = response.data.csrfToken;
      instance
        .get("https://localhost:3000/cas/test", {
          headers: {
            Authorization: req.cookies["SSO-Cookie"], // 测试按钮是受保护的资源
            csrftoken:csrfToken
          },
        })
        .then((response) => {
          if (response.data.code === 0) {
            res.send({
              code: 0,
              data: {
                msg: response.data.data.msg,
              },
            });
          } else {
            res.cookie("SSO-Cookie", "", { maxAge: 0 });
            res.send({
              code: 1,
              msg: response.data.msg,
            });
          }
        })
        .catch((err) => {
          res.cookie("SSO-Cookie", "", { maxAge: 0 });
          res.send({
            code: 1,
            msg: "测试失败",
          });
        });
    })
    .catch((err) => {
      res.send({
        code: 1,
        msg: "错误+" + err,
      });
    });
});
