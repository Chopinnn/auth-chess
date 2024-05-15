let exit = document.querySelector(".exit");
let normalbtn = document.querySelector(".test1");
let superbtn = document.querySelector(".test2");
const appId = "9998";

// 从url中获取参数
function getFromUrl(id) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has(id)) {
    return searchParams.get(id);
  } else {
    return "";
  }
}
var ws = new WebSocket(`wss://localhost:3001`);
ws.onopen = function () {
  console.log("wss已连接");
};

ws.onmessage = async function (event) {
  console.log("event.data", event.data);
  console.log('tk', localStorage.getItem(`RefreshToken-${appId}`))
  let flag = await checkUser(event.data, localStorage.getItem(`RefreshToken-${appId}`))
  console.log('flag', flag)
  if (flag) {
    console.log("接收到退出登录通知");
    clearToken();
    ws.close();
    window.location.href = `https://localhost:3000?appId=${appId}`;
  }
};

window.onbeforeunload = function () {
  if (ws) {
    ws.close();
  }
  console.log("页面跳转");
};

// 清空本地token
function clearToken() {
  if (
    localStorage.getItem(`AccessToken-${appId}`) &&
    localStorage.getItem(`RefreshToken-${appId}`)
  ) {
    localStorage.removeItem(`AccessToken-${appId}`);
    localStorage.removeItem(`RefreshToken-${appId}`);
  }
}

// 检查需要退出的是否是当前用户
async function checkUser(token1, token2) {
  let res = await fetch(`https://localhost:${appId}/checkUser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token1: token1,
      token2: token2,
    }),
  })
  let data = await res.json();
  if (data.code === 0) {
    // 允许退出
    return true
  } else {
    return false
  }
}

window.onload = function () {
  // 从认证中心跳转到本页面时，会带上授权码
  if (getFromUrl("authCode")) {
    // 通过授权码获取token
    fetch(`https://localhost:3000/cas/serviceLoginToken?appId=${appId}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authCode: getFromUrl("authCode"),
        username: getFromUrl("username"),
        phone: getFromUrl("phone"),
        authType: getFromUrl("username") ? "username" : "phone",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0) {
          console.log("AccessToken", data.data.AccessToken);
          // 存储token
          localStorage.setItem(`AccessToken-${appId}`, data.data.AccessToken);
          localStorage.setItem(`RefreshToken-${appId}`, data.data.RefreshToken);
          // 刷新页面，去检查是否登录
          window.location.href = `https://localhost:${appId}`;
        } else {
          // 授权码无效,重定向到登录页面
          window.location.href = `https://localhost:3000`;
          console.log(data.msg);
        }
      });
  } else if (
    localStorage.getItem(`AccessToken-${appId}`) &&
    localStorage.getItem(`RefreshToken-${appId}`)
  ) {
    console.log("本地验证");
    checkLogin();
  } else {
    // 不是认证中心跳转到本页面时，且本地应用不存在token，则会判断是否在其他应用登录过
    checkSSOLogin();
  }
};

exit.addEventListener("click", function () {
  console.log("exit退出");
  logout();
});

normalbtn.addEventListener("click", function () {
  console.log("普通用户按钮");
  test();
});

superbtn.addEventListener("click", function () {
  console.log("超级用户按钮");
  test();
});

// 判断用户是否在其他应用登录过
async function checkSSOLogin() {
  let res = await fetch(`https://localhost:3000/cas/checkSSOLogin`, {
    method: "POST",
    credentials: "include",
  });
  let data = await res.json();
  if (data.code === 0) {
    // 验证通过，开始单点登录
    console.log("已在其它应用登录过，开始单点登录", data.data.msg);
    ssoLogin();
  } else {
    // 用户未在其他应用登录过，重定向到认证服务器的登录页面
    window.location.href = `https://localhost:3000?appId=${appId}`;
  }
}

// 先本地通过AccessToken检查用户是否登录，若未登录则使用RefreshToken向服务器验证
async function checkLogin() {
  let res = await fetch(`https://localhost:${appId}/checkLogin`, {
    method: "GET",
    headers: {
      Authorization: localStorage.getItem(`AccessToken-${appId}`),
    },
  });
  let data = await res.json();
  if (data.code === 0) {
    console.log("AccessToken有效", data.data.msg);
  } else {
    // 使用RefreshToken向服务器验证
    let res = await fetch(`https://localhost:3000/cas/checkLogin`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: localStorage.getItem(`RefreshToken-${appId}`),
      },
    });
    let result = await res.json();
    if (result.code === 0) {
      // RefreshToken有效，更新AccessToken
      localStorage.setItem(`AccessToken-${appId}`, result.data.AccessToken);
      console.log("RefreshToken有效", result.data.msg);
    } else {
      // RefreshToken失效
      // todo:这里应该还要重置数据库中的登录状态
      localStorage.removeItem(`AccessToken-${appId}`);
      localStorage.removeItem(`RefreshToken-${appId}`);
      window.location.href = `https://localhost:3000?appId=${appId}`;
    }
  }
}

// 单点登录：获取授权码authCode
async function ssoLogin() {
  let res = await fetch(
    `https://localhost:3000/cas/serviceLoginAuthCode?appId=${appId}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ssoFlag: true,
      }),
    }
  );
  let result = await res.json();
  if (result?.code === 0) {
    // 单点登录成功，跳转回原应用
    window.location.href = `https://localhost:${appId}?authCode=${
      result.data.authCode
    }&username=${result.data.username || ""}&phone=${result.data.phone}`;
  } else {
    // 单点登录失败，重定向到登录页面
    window.location.href = `https://localhost:3000?appId=${appId}`;
  }
}

// 退出登录
async function logout() {
  let res = await fetch(`https://localhost:3000/cas/logout`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: localStorage.getItem(`RefreshToken-${appId}`),
    },
  });
  let data = await res.json();
  if (data.code === 0) {
    // 退出成功
    clearToken();
    window.location.href = `https://localhost:3000?appId=${appId}`;
  } else {
    console.log("退出失败，已经是未登录状态了，或者是数据库修改报错", data.msg);
    // 刷新页面，重新检查是否登录
    window.location.href = `https://localhost:${appId}`;
  }
}

// 权限测试按钮
async function test() {
  // 先获取csrfToken
  let res0 = await fetch(`https://localhost:3000/cas/csrfToken`, {
    method: "GET",
    credentials: "include",
  });
  let data0 = await res0.json();
  let csrfToken = data0.csrfToken;
  let res = await fetch(`https://localhost:3000/cas/test`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: localStorage.getItem(`AccessToken-${appId}`),
      csrftoken: csrfToken,
    },
  });
  let data = await res.json();
  if (data.code === 0) {
    window.alert(data.data.msg);
  } else {
    // 当token失效测试失败时，刷新页面
    console.log(data.msg);
    window.location.href = `https://localhost:${appId}`;
  }
}
