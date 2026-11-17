// Isolated UI fixture: no Bilibili requests, accounts, or persistent script data.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<title>播放器工作副本隔离交互核对</title>
<style>body{font:16px system-ui;background:#e9edf1;padding:32px;color:#243040}main{max-width:540px}main button,main select{font:inherit;margin:8px;padding:8px}pre{white-space:pre-wrap}</style>
<main><h1>播放器工作副本隔离交互核对</h1><p>当前脚本 + 合成收藏夹。没有登录、真实视频或账号数据。播放跳转未隔离，请勿点击视频、上一首、下一首。</p>
<p>测试收藏夹：测试音乐；视频：测试视频 01～30。当前项：01。</p>
<label>读取场景 <select id="scenario"><option value="ok">完整读取</option><option value="partial">第一页成功，第二页失败</option><option value="error">第一页失败</option></select></label>
<button id="reset">重置测试数据并刷新</button><button id="inspect">显示测试队列</button><pre id="result"></pre></main>
<script src="/fixture.js"></script><script src="/player.js"></script><script src="/regression.js"></script></html>`;
const fixture = `const cover='/cover.svg';
const items=Array.from({length:30},(_,i)=>({bvid:'BV_TEST_'+(i+1),title:'测试视频 '+String(i+1).padStart(2,'0'),cover}));
const state={BCP_UI:{version:4.7,width:420,height:620,collapsed:false,theme:'dark',ballX:800,ballY:100,x:650,y:40},BCP_PLAY:{originalList:structuredClone(items),currentList:structuredClone(items),currentIndex:0,isPlaying:false,folderNames:['测试音乐'],folders:[{fid:'100',name:'测试音乐',url:'/?fid=100'}]}};
window.GM_getValue=(k,d)=>structuredClone(state[k]??d);window.GM_setValue=(k,v)=>state[k]=structuredClone(v);
const fixtureListeners={};window.GM_addValueChangeListener=(key,fn)=>(fixtureListeners[key]??=[]).push(fn);window.GM_registerMenuCommand=()=>{};window.fixtureState=state;
window.fixtureRemote=(key,value)=>{const old=state[key];state[key]=structuredClone(value);for(const fn of fixtureListeners[key]||[])fn(key,old,structuredClone(value),true)};
const fixtureTheme=new URLSearchParams(location.search).get('theme');if(['dark','light','acnh'].includes(fixtureTheme))state.BCP_UI.theme=fixtureTheme;
if(new URLSearchParams(location.search).has('startup')) {
 state.BCP_UI.collapsed=new URLSearchParams(location.search).get('startup')==='collapsed';
 window.startupSamples=[];
 const append=document.documentElement.appendChild.bind(document.documentElement);
 document.documentElement.appendChild=function(el){const result=append(el);if(el.id==='bcp-root'){
   const sample=()=>{const w=document.getElementById('bcp-window'),b=document.getElementById('bcp-ball');startupSamples.push({windowVisible:w.getBoundingClientRect().width>0&&Number(getComputedStyle(w).opacity)>0,ballVisible:b.getBoundingClientRect().width>0&&Number(getComputedStyle(b).opacity)>0});};
   sample();let frames=0;function frame(){sample();if(++frames<25)requestAnimationFrame(frame);else window.startupDone=true;}requestAnimationFrame(frame);
 }return result;};
}
window.fetch=async url=>{const pn=Number(new URL(url).searchParams.get('pn'));const mode=document.getElementById('scenario').value;if(mode==='error'||(mode==='partial'&&pn===2))throw Error('Synthetic network failure');return {ok:true,json:async()=>({code:0,data:{info:{title:'测试演讲'},medias:[{bvid:'BV_TEST_EXTRA',title:'测试新增视频',cover}],has_more:mode==='partial'}})}};
document.getElementById('reset').onclick=()=>location.reload();
document.getElementById('inspect').onclick=()=>document.getElementById('result').textContent=JSON.stringify({current:state.BCP_PLAY.currentList.map(x=>x.title),original:state.BCP_PLAY.originalList.map(x=>x.title)},null,2);`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const routes = {
    "/cover.svg": [
      "image/svg+xml",
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50" viewBox="0 0 80 50"><rect width="80" height="50" fill="#536d77"/><path d="M36 33V14l16-3v18M36 18l16-3" fill="none" stroke="#f3eee0" stroke-width="2"/><ellipse cx="32" cy="34" rx="5" ry="3" fill="#f3eee0"/><ellipse cx="48" cy="30" rx="5" ry="3" fill="#f3eee0"/></svg>',
    ],
    "/": ["text/html; charset=utf-8", html],
    "/fixture.js": ["application/javascript; charset=utf-8", fixture],
    "/player.js": [
      "application/javascript; charset=utf-8",
      fs.readFileSync(path.join(root, "bilibili-mixed-random-player.user.js")),
    ],
  };
  routes["/regression.js"] = [
    "application/javascript; charset=utf-8",
    fs.readFileSync(path.join(__dirname, "browser-regression.js")),
  ];
  const route =
    url.pathname === "/bilibili-mixed-random-player.user.js"
      ? routes["/player.js"]
      : routes[url.pathname];
  if (!route) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": route[0], "Cache-Control": "no-store" });
  res.end(route[1]);
});
server.listen(8765, "127.0.0.1", () =>
  console.log("Isolated review fixture: http://127.0.0.1:8765/?fid=100"),
);
