const assert = require("node:assert/strict");
const { setup } = require("./playback-regression.cjs");
const plain = (value) => JSON.parse(JSON.stringify(value));
function boot(ui) {
  return setup({
    browsing: true,
    bus: {
      store: {
        BCP_UI: {
          width: 600,
          height: 700,
          ball: 52,
          ballX: 674,
          ballY: 424,
          direction: "down-right",
          collapsed: true,
          ...ui,
        },
      },
      listeners: [],
    },
  });
}
function drag(s, id, dx, dy) {
  const e = s.elements.get(id);
  e.emit("pointerdown", { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
  e.emit("pointermove", { pointerId: 1, clientX: dx, clientY: dy });
  e.emit("pointerup", { pointerId: 1 });
}
const cases = [
  [
    "旧版展开窗口迁移后收起并刷新，不使用过期的球坐标",
    () => {
      const s = boot({
        collapsed: false,
        x: 500,
        y: 100,
        width: 600,
        height: 600,
        ballX: 800,
        ballY: 20,
      });
      const before = s.layout.read();
      s.layout.collapse();
      const next = setup({ browsing: true, bus: s.bus });
      assert.deepEqual(plain(next.layout.read().anchor), plain(before.anchor));
      next.layout.expand();
      assert.deepEqual(
        plain(next.layout.read().geometry),
        plain(before.geometry),
      );
    },
  ],
  [
    "中央锚点受限展开后拖窗，收起展开尺寸和角点不变",
    () => {
      const s = boot();
      s.layout.expand();
      drag(s, "bcp-drag-handle", 20, 20);
      const before = s.layout.read();
      s.layout.collapse();
      const closed = s.layout.read();
      s.layout.expand();
      const after = s.layout.read();
      assert.deepEqual(after.geometry, before.geometry);
      assert.deepEqual(closed.anchor, before.anchor);
    },
  ],
  [
    "拖动悬浮球重新选择向左上优先，与此前展开方向无关",
    () => {
      const s = boot({ width: 420, height: 400 });
      drag(s, "bcp-ball", 50, 0);
      s.layout.expand();
      assert.equal(s.layout.read().direction, "up-left");
    },
  ],
  [
    "视口临时缩小再恢复，展开位置与大小恢复",
    () => {
      const s = boot({ ballX: 1300, ballY: 800, direction: "up-left" });
      s.layout.expand();
      drag(s, "bcp-drag-handle", -10, -10);
      const before = s.layout.read();
      s.context.window.visualViewport = { width: 700, height: 500 };
      s.layout.adaptViewport();
      s.context.window.visualViewport = { width: 1400, height: 900 };
      s.layout.adaptViewport();
      assert.deepEqual(s.layout.read().geometry, before.geometry);
    },
  ],
  [
    "修改球大小后收起刷新，球与窗口仍为同一锚点",
    () => {
      const s = boot({ ballX: 1300, ballY: 800, direction: "up-left" });
      s.layout.expand();
      s.layout.applySetting("ball", 64);
      s.layout.collapse();
      const before = s.layout.read();
      const next = setup({ browsing: true, bus: s.bus });
      assert.deepEqual(plain(next.layout.read().anchor), plain(before.anchor));
      next.layout.expand();
      assert.deepEqual(
        plain(next.layout.read().geometry),
        plain(before.geometry),
      );
    },
  ],
  [
    "悬浮球按视口比例适配，临时小视口不写坏尺寸",
    () => {
      const s = boot({ ballX: 1250, ballY: 780, direction: "up-left" });
      drag(s, "bcp-ball", -10, -10);
      const saved = plain(s.bus.store.BCP_UI.layout);
      s.context.window.visualViewport = { width: 700, height: 500 };
      s.layout.adaptViewport();
      const a = s.layout.read().anchor;
      assert.ok(
        Math.abs((a.x - 12) / (700 - 24 - 52) - saved.relative.x) < 1e-9,
      );
      assert.ok(
        Math.abs((a.y - 12) / (500 - 24 - 52) - saved.relative.y) < 1e-9,
      );
      assert.deepEqual(plain(s.bus.store.BCP_UI.layout), saved);
    },
  ],
  [
    "另一页接收同一布局，但不抢改本页展开收起状态",
    () => {
      const s = boot({ ballX: 1250, ballY: 780, direction: "up-left" }),
        other = setup({ browsing: true, bus: s.bus });
      s.layout.expand();
      drag(s, "bcp-drag-handle", -50, -20);
      assert.equal(other.layout.read().ui.collapsed, true);
      other.layout.expand();
      assert.deepEqual(
        plain(other.layout.read().geometry),
        plain(s.layout.read().geometry),
      );
      other.layout.collapse();
      assert.equal(s.layout.read().ui.collapsed, false);
    },
  ],
];
let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log("PASS " + name);
  } catch (e) {
    failed++;
    console.log("FAIL " + name + "\n" + e.message);
  }
}
process.exitCode = failed ? 1 : 0;
