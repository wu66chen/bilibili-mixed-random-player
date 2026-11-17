// Historical 1.2 reproducer: runs the fixed baseline commit, not working code.
// This is a logic reproduction, NOT Tampermonkey or Bilibili acceptance.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const code=require('node:child_process').execFileSync('git',['show','3f27aa930debb86153bc04c9d591660d95fe798f:bilibili-mixed-random-player.user.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
function setup({partial=false}={}) {
  const elements=new Map(), alerts=[], timeouts=[], intervals=[];
  let scrollCalls=0;
  function element(id) {
    if(elements.has(id))return elements.get(id);
    const classes=new Set();
    const e={style:{},innerHTML:'',innerText:'',disabled:false,offsetLeft:0,offsetTop:0,offsetWidth:420,offsetHeight:620,
      events:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on??!classes.has(x))classes.add(x);else classes.delete(x)}},
      addEventListener(k,fn){this.events[k]=fn},appendChild(){},setAttribute(){},querySelectorAll(){return[]},
      querySelector(){return {scrollIntoView(){scrollCalls++}}},getBoundingClientRect(){return {left:0,top:0,width:28,height:28}},click(){this.onclick?.({stopPropagation(){}})}};
    elements.set(id,e);return e;
  }
  const items=['A','B','C'].map(bvid=>({bvid,title:'测试'+bvid,cover:''}));
  const store={BCP_UI:{version:4.7,width:420,height:620,collapsed:false,x:0,y:0,ballX:0,ballY:0,theme:'dark'},BCP_PLAY:{originalList:structuredClone(items),currentList:structuredClone(items),currentIndex:0,isPlaying:true,folderNames:[],folders:[]}};
  const video={paused:false,readyState:4,ended:false,duration:100,currentTime:42,play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}};
  const document={head:element('head'),body:element('body'),documentElement:element('html'),getElementById:element,createElement:()=>element(Symbol()),addEventListener(){},querySelector:()=>video};
  const window={innerWidth:1400,innerHeight:900,location:{href:'https://space.bilibili.com/0/favlist?fid=100',pathname:'/video/A',search:''}};
  const context={document,window,URLSearchParams,ResizeObserver:class{observe(){}},console,alert:x=>alerts.push(x),confirm:()=>true,
    GM_getValue:(k,d)=>structuredClone(store[k]??d),GM_setValue:(k,v)=>store[k]=structuredClone(v),GM_registerMenuCommand(){},GM_addValueChangeListener(){},
    setInterval(fn,ms){intervals.push({fn,ms});return intervals.length},clearInterval(){},setTimeout(fn,ms){if(ms===200){fn();}else timeouts.push(fn)},
    fetch:async url=>{if(partial&&new URL(url).searchParams.get('pn')==='2')throw Error('Synthetic network failure');return {json:async()=>({code:0,data:{info:{title:'测试收藏夹'},medias:[{bvid:'D',title:'测试D',cover:''}],has_more:partial}})}}};
  vm.runInNewContext(code,context,{filename:'bilibili-mixed-random-player.user.js'});
  return {elements,store,video,window,alerts,timeouts,intervals,scrollCalls:()=>scrollCalls};
}
function remove(s,index){s.elements.get('bcp-list').events.click({stopPropagation(){},target:{closest:selector=>selector==='.bcp-item-del'?{getAttribute:()=>String(index)}:null}})}
const cases=[
  ['打乱保持当前项、播放状态、进度和页面',async()=>{const s=setup();const href=s.window.location.href;s.elements.get('bcp-shuffle').click();assert.equal(s.store.BCP_PLAY.currentList[0].bvid,'A');assert.equal(s.video.currentTime,42);assert.equal(s.video.paused,false);assert.equal(s.window.location.href,href)}],
  ['移除 B 后恢复原序仍应为 A,C',async()=>{const s=setup();remove(s,1);s.elements.get('bcp-restore').click();assert.deepEqual(s.store.BCP_PLAY.currentList.map(x=>x.bvid),['A','C'])}],
  ['移除最后一项 C 后恢复原序不应复活',async()=>{const s=setup();remove(s,2);s.elements.get('bcp-restore').click();assert.deepEqual(s.store.BCP_PLAY.currentList.map(x=>x.bvid),['A','B'])}],
  ['分页失败不应显示完整载入成功',async()=>{const s=setup({partial:true});await s.elements.get('bcp-add-current').onclick();assert.equal(s.alerts.some(x=>x.startsWith('载入成功')),false)}],
  ['仅暂停不应触发列表自动滚动',async()=>{const s=setup();s.timeouts.splice(0).forEach(fn=>fn());const before=s.scrollCalls();s.elements.get('bcp-play-pause').click();s.timeouts.splice(0).forEach(fn=>fn());assert.equal(s.scrollCalls(),before)}],
  ['清空仅改变本地队列，网页视频继续播放（现状记录）',async()=>{const s=setup();s.elements.get('bcp-clear').click();assert.equal(s.store.BCP_PLAY.currentList.length,0);assert.equal(s.video.paused,false);assert.equal(s.video.currentTime,42)}]
];
(async()=>{let failed=0;for(const [name,run] of cases){try{await run();console.log('PASS '+name)}catch(e){failed++;console.log('FAIL '+name+'\n'+e.message)}}console.log('Result: '+(cases.length-failed)+' passed, '+failed+' failed');process.exitCode=failed?1:0})();
