// Actual userscript in an isolated DOM/GM/media fixture. No page __INITIAL_STATE__,
// as in the Tampermonkey sandbox that reproduced the multipart failure.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const source = fs.readFileSync(
  path.join(__dirname, "../bilibili-mixed-random-player.user.js"),
  "utf8",
);
const flush = () => new Promise((resolve) => setImmediate(resolve));
function setup({
  parts = 2,
  part = 1,
  index = 0,
  fail = false,
  bus,
  browsing = false,
} = {}) {
  const items = ["BV_TEST_A", "BV_TEST_B"].map((bvid) => ({
    bvid,
    title: bvid,
    cover: "",
  }));
  bus ||= {
    store: {
      BCP_PLAY: {
        originalList: structuredClone(items),
        currentList: structuredClone(items),
        currentIndex: index,
        isPlaying: true,
        folders: [],
        folderNames: [],
      },
    },
    listeners: [],
  };
  const elements = new Map(),
    intervals = [],
    events = new Map(),
    token = randomUUID();
  let mounted = false,
    calls = 0,
    networkFailure = fail;
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(),
      handlers = new Map();
    const el = {
      id,
      style: { setProperty() {} },
      dataset: {},
      children: [],
      hidden: false,
      scrollTop: 0,
      offsetWidth: 420,
      offsetHeight: 620,
      offsetTop: 0,
      offsetLeft: 0,
      classList: {
        toggle(k, on) {
          if (on ?? !classes.has(k)) classes.add(k);
          else classes.delete(k);
        },
        add: (k) => classes.add(k),
        remove: (k) => classes.delete(k),
        contains: (k) => classes.has(k),
      },
      setAttribute() {},
      getAttribute() {},
      appendChild(child) {
        this.children.push(child);
        elements.set(child.id, child);
      },
      contains() {
        return false;
      },
      focus() {},
      setPointerCapture() {},
      closest() {
        return null;
      },
      emit(type, event) {
        for (const fn of handlers.get(type) || [])
          fn({ target: this, preventDefault() {}, ...event });
      },
      querySelector() {
        return element("actions");
      },
      querySelectorAll() {
        return [];
      },
      getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 420,
          bottom: 620,
          width: 420,
          height: 620,
        };
      },
      addEventListener(type, fn) {
        if (!handlers.has(type)) handlers.set(type, []);
        handlers.get(type).push(fn);
      },
      click() {
        return this.onclick?.({ target: this, stopPropagation() {} });
      },
    };
    elements.set(id, el);
    return el;
  }
  const media = {
    paused: false,
    ended: false,
    currentTime: 5,
    duration: 100,
    readyState: 4,
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
  const document = {
    body: element("body"),
    head: element("head"),
    documentElement: element("html"),
    createElement: () => element(randomUUID()),
    getElementById: (id) =>
      !mounted && id === "bcp-window" ? null : element(id),
    querySelector: () => media,
    addEventListener(type, fn) {
      if (!events.has(type)) events.set(type, []);
      events.get(type).push(fn);
    },
  };
  document.documentElement.appendChild = () => {
    mounted = true;
  };
  const location = {
    pathname: browsing ? "/favlist" : "/video/" + items[index].bvid,
    search: `?p=${part}`,
    href: browsing
      ? "https://space.bilibili.com/0/favlist?fid=100"
      : `https://www.bilibili.com/video/${items[index].bvid}?p=${part}`,
  };
  const window = {
    location,
    innerWidth: 1400,
    innerHeight: 900,
    addEventListener() {},
  };
  window.top = window.self = window;
  const context = {
    window,
    document,
    location,
    innerWidth: 1400,
    innerHeight: 900,
    URL,
    URLSearchParams,
    AbortController,
    crypto: { randomUUID },
    console,
    sessionStorage: { getItem: () => null, setItem() {} },
    alert() {},
    confirm: () => true,
    GM_getValue: (key, fallback) => structuredClone(bus.store[key] ?? fallback),
    GM_setValue(key, value) {
      const old = bus.store[key];
      bus.store[key] = structuredClone(value);
      for (const listener of bus.listeners)
        if (listener.key === key && listener.token !== token)
          listener.fn(key, old, structuredClone(value), true);
    },
    GM_addValueChangeListener(key, fn) {
      bus.listeners.push({ key, fn, token });
    },
    GM_registerMenuCommand() {},
    setInterval(fn, ms) {
      intervals.push({ fn, ms });
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    fetch: async (url) => {
      calls++;
      if (networkFailure) throw Error("Fixture offline");
      const bvid = new URL(url).searchParams.get("bvid");
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            bvid,
            pages: Array.from({ length: parts }, (_, i) => ({
              page: i + 1,
              cid: i + 1,
            })),
          },
        }),
      };
    },
  };
  // Test-only access to the actual layout functions; production source has no test hooks.
  vm.runInNewContext(
    source.replace(
      /\}\)\(\);\s*$/,
      "globalThis.__layoutTest={resizedRect,fitRect,collapse,expand,adaptViewport,applySetting,read:()=>({geometry:{...geometry},anchor:{...anchor},direction,ui:{...ui}})};})();",
    ),
    context,
  );
  return {
    context,
    layout: context.__layoutTest,
    bus,
    elements,
    media,
    location,
    calls: () => calls,
    setFailure: (value) => (networkFailure = value),
    async tick() {
      for (const timer of intervals) if (timer.ms === 500) timer.fn();
      await flush();
      await flush();
    },
    async end() {
      media.ended = true;
      media.paused = true;
      let stopped = false;
      for (const fn of events.get("ended") || [])
        fn({
          target: media,
          stopImmediatePropagation() {
            stopped = true;
          },
        });
      await flush();
      await flush();
      return stopped;
    },
  };
}
const cases = [
  [
    "sandbox无页面全局变量时 P1 接 P2",
    async () => {
      const s = setup();
      await s.tick();
      assert.equal(await s.end(), true);
      assert.match(s.location.href, /BV_TEST_A\?p=2&/);
      assert.equal(s.bus.store.BCP_PLAY.currentIndex, 0);
    },
  ],
  [
    "三P视频 P2 接 P3，仍为同一队列项",
    async () => {
      const s = setup({ parts: 3, part: 2 });
      await s.tick();
      await s.end();
      assert.match(s.location.href, /BV_TEST_A\?p=3&/);
      assert.equal(s.bus.store.BCP_PLAY.currentIndex, 0);
    },
  ],
  [
    "最后一P结束后才接下一BV",
    async () => {
      const s = setup({ part: 2 });
      await s.tick();
      await s.end();
      assert.match(s.location.href, /BV_TEST_B\?p=1&/);
      assert.equal(s.bus.store.BCP_PLAY.currentIndex, 1);
    },
  ],
  [
    "队列末项最后一P结束后停止",
    async () => {
      const s = setup({ part: 2, index: 1 });
      const before = s.location.href;
      await s.tick();
      await s.end();
      assert.equal(s.location.href, before);
      assert.equal(s.bus.store.BCP_PLAY.isPlaying, false);
    },
  ],
  [
    "元数据失败不静默跳过；重试后续播",
    async () => {
      const s = setup({ fail: true });
      const before = s.location.href;
      await s.tick();
      await s.end();
      await s.tick();
      assert.equal(s.location.href, before);
      assert.equal(s.calls(), 1);
      assert.equal(s.elements.get("bcp-retry-parts").hidden, false);
      s.setFailure(false);
      s.elements.get("bcp-retry-parts").click();
      await flush();
      await flush();
      assert.match(s.location.href, /BV_TEST_A\?p=2&/);
    },
  ],
  [
    "ended与轮询不会重复切歌",
    async () => {
      const s = setup({ part: 2 });
      await s.tick();
      await s.end();
      const ticket = s.bus.store.BCP_HANDOFF.token;
      await s.tick();
      await s.end();
      assert.equal(s.bus.store.BCP_HANDOFF.token, ticket);
      assert.equal(s.bus.store.BCP_PLAY.currentIndex, 1);
    },
  ],
  [
    "浏览页控制唯一播放页，不自行跳转",
    async () => {
      const player = setup();
      await player.tick();
      const browser = setup({ bus: player.bus, browsing: true });
      const before = browser.location.href;
      browser.elements.get("bcp-play-pause").click();
      await flush();
      assert.equal(player.media.paused, true);
      assert.equal(browser.location.href, before);
      assert.equal(browser.bus.store.BCP_PLAY.isPlaying, false);
    },
  ],
  [
    "重复打开当前队列视频时副本不同时播放",
    async () => {
      const player = setup();
      await player.tick();
      const duplicate = setup({ bus: player.bus });
      await duplicate.tick();
      assert.equal(duplicate.media.paused, true);
      assert.equal(player.media.paused, false);
    },
  ],
  [
    "过期播放页可被浏览页接管，旧页停止",
    async () => {
      const player = setup();
      await player.tick();
      const oldOwner = player.bus.store.BCP_OWNER.id;
      const browser = setup({ bus: player.bus, browsing: true });
      player.bus.store.BCP_OWNER.time -= 16000;
      browser.elements.get("bcp-play-pause").click();
      await flush();
      assert.notEqual(player.bus.store.BCP_OWNER.id, oldOwner);
      assert.equal(player.media.paused, true);
      assert.match(browser.location.href, /BV_TEST_A\?p=1&/);
    },
  ],
  [
    "八方向缩放固定对边，并限制在视口内",
    async () => {
      const s = setup(),
        initial = { x: 200, y: 100, width: 420, height: 620 };
      for (const edge of ["n", "s", "w", "e", "nw", "ne", "sw", "se"]) {
        for (const delta of [-10000, -40, 40, 10000]) {
          const r = s.layout.resizedRect(initial, edge, delta, delta);
          assert.ok(
            r.x >= 8 &&
              r.y >= 8 &&
              r.x + r.width <= 1392 &&
              r.y + r.height <= 892,
            edge + " bounds",
          );
          assert.ok(r.width >= 320 && r.height >= 400, edge + " minimum");
          if (!edge.includes("w")) assert.equal(r.x, initial.x);
          if (!edge.includes("e"))
            assert.equal(r.x + r.width, initial.x + initial.width);
          if (!edge.includes("n")) assert.equal(r.y, initial.y);
          if (!edge.includes("s"))
            assert.equal(r.y + r.height, initial.y + initial.height);
        }
      }
    },
  ],
];
module.exports = { setup };
if (require.main === module)
  (async () => {
    for (const [name, run] of cases) {
      await run();
      console.log("PASS " + name);
    }
    console.log(`${cases.length} playback regressions passed`);
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
