let exit = document.querySelector(".exit");
let testbtn = document.querySelector(".test");
const appId = "9998";

window.onload = function () {
  // 其它页面跳转到本页面时，会带上授权码
  if(getFromUrl("authCode")){
    // 通过授权码获取token
    fetch(`https://localhost:3000/cas/serviceLoginToken?appId=${appId}`, {
      method: "POST",
      credentials: 'include',
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
          // 刷新页面，去检查是否登录
          window.location.href = `https://localhost:${appId}`;
          console.log(data.data.msg);
        } else {
          // 授权码无效,重定向到登录页面
          window.location.href = `https://localhost:3000`;
          console.log(data.msg);
        }
      });
  }else{
    // 不是其它页面跳转到本页面时，会判断是否登录
    checkLogin();
  }
};

exit.addEventListener("click", function () {
  console.log("exit");
  logout();
});
testbtn.addEventListener("click", function () {
  console.log("test");
  test();
});

// 从url中获取参数
function getFromUrl(id) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has(id)) {
    return searchParams.get(id);
  }else{
    return '';
  }
}

// 判断用户是否登录
async function checkLogin() {
  let res = await fetch(`https://localhost:${appId}/checkLogin`, {
    method: "GET",
  });
  let data = await res.json();
  if (data.code === 0) {
    // token验证通过，已登录：由于各个子应用使用的共享token，就不必单独重新请求了
    console.log(data.data.msg);
  } else {
    // 当用户未登录时，重定向到认证服务器的登录页面
    window.location.href = `https://localhost:3000?appId=${appId}`;
  }
}

async function logout() {
  let res = await fetch(`https://localhost:${appId}/logout`, {
    method: "GET",
  });
  let data = await res.json();
  if (data.code === 0) {
    window.location.href = `https://localhost:3000`;
  } else if(data.code===2){  // 数据库操作失败导致退出失败
    console.log("退出失败",data.msg)
  } else{
    console.log("退出失败",data.msg)
  }
}

async function test(){
  let res = await fetch(`https://localhost:${appId}/test`, {
    method: "GET",
  });
  let data = await res.json();
  if (data.code === 0) {
    console.log(data.data.msg);
    window.alert(data.data.msg);
  }else{
    // 当token失效测试失败时，重定向到认证服务器的登录页面
    console.log(data.msg)
    window.location.href = `https://localhost:3000?appId=${appId}`;
  }
}
