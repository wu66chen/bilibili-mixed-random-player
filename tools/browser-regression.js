// Run only on the local synthetic fixture. No real account or favorites are used.
window.runPlayerRegression = async function () {
  const results = [];
  const $ = (id) => document.getElementById("bcp-" + id);
  const check = (name, condition) => {
    results.push({ name, pass: Boolean(condition) });
    if (!condition) throw new Error(name);
  };
  const clickRemove = (bvid) => {
    document.querySelector(`.bcp-item-del[data-bvid="${bvid}"]`).click();
    if (!document.getElementById("bcp-confirm").open)
      throw Error("移除必须先确认");
    document.getElementById("bcp-confirm-remove").click();
  };
  const ids = () => fixtureState.BCP_PLAY.currentList.map((v) => v.bvid);
  // Reproduce host reset styles that make a closed native dialog visible.
  const hostDialogStyle = document.createElement("style");
  hostDialogStyle.textContent =
    "dialog { display:block !important; } h2,h3 { color:black !important; font-family:serif !important; }";
  document.head.appendChild(hostDialogStyle);
  const initialTheme = fixtureState.BCP_UI.theme;
  $("settings-open").click();
  for (const theme of ["dark", "light", "acnh"]) {
    $("setting-theme").click();
    document.querySelector('#bcp-menu [data-value="' + theme + '"]').click();
    const expected = getComputedStyle($("window"));
    check(
      theme + " 设置标题与图标抵抗宿主样式并跟随主题",
      [...document.querySelectorAll("#bcp-settings h2,#bcp-settings h3")].every(
        (e) => {
          const s = getComputedStyle(e),
            icon = e.querySelector("svg");
          return (
            s.color === expected.color &&
            s.fontFamily === expected.fontFamily &&
            (!icon || getComputedStyle(icon).color === s.color)
          );
        },
      ),
    );
    $("settings-back").click();
    document.querySelector('.bcp-item-del[data-bvid="BV_TEST_2"]').click();
    const titleStyle = getComputedStyle($("confirm-title"));
    check(
      theme + " 确认框标题抵抗宿主样式",
      titleStyle.color === expected.color &&
        titleStyle.fontFamily === expected.fontFamily,
    );
    $("confirm-cancel").click();
    $("settings-open").click();
  }
  $("setting-theme").click();
  document
    .querySelector('#bcp-menu [data-value="' + initialTheme + '"]')
    .click();
  $("settings-back").click();
  $("collapse-btn").click();
  $("ball").click();
  $("settings-open").click();
  $("setting-theme").click();
  fixtureRemote("BCP_UI", { ...fixtureState.BCP_UI, theme: "light" });
  check(
    "远程设置更新关闭旧菜单并同步展开状态",
    $("menu").hidden &&
      $("setting-theme").getAttribute("aria-expanded") === "false",
  );
  $("setting-theme").click();
  check(
    "重新打开菜单显示远程新值",
    document.querySelector('#bcp-menu [aria-selected="true"]').dataset.value ===
      "light",
  );
  document
    .querySelector('#bcp-menu [data-value="' + initialTheme + '"]')
    .click();
  $("settings-back").click();
  const buttonBefore = $("collapse-btn").getBoundingClientRect();
  $("collapse-btn").click();
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  const buttonDuring = $("collapse-btn").getBoundingClientRect();
  check(
    "收起动画不移动按钮命中区域",
    Math.abs(buttonBefore.x - buttonDuring.x) < 0.1 &&
      Math.abs(buttonBefore.y - buttonDuring.y) < 0.1 &&
      getComputedStyle($("window")).transform === "none",
  );
  $("ball").click();
  check(
    "宿主页强制显示 dialog 时未打开的确认框仍隐藏",
    !$("confirm").open && $("confirm").getBoundingClientRect().width === 0,
  );
  document.querySelector('.bcp-item-del[data-bvid="BV_TEST_2"]').click();
  check(
    "移除确认打开后正常显示标题和内容",
    $("confirm").open &&
      $("confirm").getBoundingClientRect().width > 0 &&
      $("confirm-title").textContent.length > 0,
  );
  $("confirm-cancel").click();
  check(
    "取消后确认框实际消失且不改队列",
    !$("confirm").open &&
      $("confirm").getBoundingClientRect().width === 0 &&
      ids().includes("BV_TEST_2"),
  );
  const bodyDisplay = document.body.style.display;
  try {
    document.body.style.display = "none";
    check(
      "宿主页隐藏 body 时播放器仍可显示",
      $("window").getBoundingClientRect().width > 0,
    );
  } finally {
    document.body.style.display = bodyDisplay;
  }
  const point = document.getElementById("reset").getBoundingClientRect();
  check(
    "悬浮层空白区域不拦截宿主页点击",
    !document
      .getElementById("bcp-root")
      .contains(document.elementFromPoint(point.x + 5, point.y + 5)),
  );
  document.querySelector('.bcp-item-del[data-bvid="BV_TEST_2"]').click();
  check(
    "移除确认前不修改队列",
    ids().includes("BV_TEST_2") && $("confirm").open,
  );
  $("confirm-cancel").click();
  check(
    "取消移除保留队列和窗口",
    ids().includes("BV_TEST_2") && !$("window").classList.contains("hidden"),
  );
  $("settings-open").click();
  if (!$("setting-outside").checked) $("setting-outside").click();
  $("settings-back").click();
  clickRemove("BV_TEST_2");
  check("确认移除不被外部收起误判", !$("window").classList.contains("hidden"));
  $("restore").click();
  check(
    "删除中间项不会复活或误删下一项",
    !ids().includes("BV_TEST_2") && ids().includes("BV_TEST_3"),
  );
  clickRemove("BV_TEST_30");
  $("shuffle").click();
  $("restore").click();
  check("删除末项后打乱／恢复不复活", !ids().includes("BV_TEST_30"));
  $("undo").click();
  check(
    "撤销准确恢复最近移出项",
    ids().includes("BV_TEST_30") && !ids().includes("BV_TEST_2"),
  );
  clickRemove("BV_TEST_1");
  check(
    "删除当前项保留独立播放项和原下一项",
    fixtureState.BCP_PLAY.detached?.item.bvid === "BV_TEST_1" &&
      fixtureState.BCP_PLAY.detached.next === "BV_TEST_3",
  );
  clickRemove("BV_TEST_3");
  check(
    "继续移出待播项时衔接后续有效项",
    fixtureState.BCP_PLAY.detached.next === "BV_TEST_4",
  );
  $("list").scrollTop = 700;
  const before = $("list").scrollTop;
  $("settings-open").click();
  $("settings-back").click();
  check("设置返回保留浏览位置", $("list").scrollTop === before);
  document.getElementById("scenario").value = "partial";
  await $("add-current").onclick();
  check("分页失败明确报告中断", $("notice").textContent.includes("读取中断"));
  document.getElementById("scenario").value = "ok";
  await $("add-current").onclick();
  check(
    "失败重试不会重复加入",
    ids().filter((v) => v === "BV_TEST_EXTRA").length === 1,
  );
  // Same video in a second source: sources are merged without duplicating playback entries.
  history.replaceState(null, "", "/?fid=101");
  await $("add-current").onclick();
  check(
    "重复视频保留两个来源",
    fixtureState.BCP_PLAY.currentList.find((v) => v.bvid === "BV_TEST_EXTRA")
      .sources.length === 2,
  );
  const beforeQueue = JSON.stringify(fixtureState.BCP_PLAY);
  $("reset-layout").click();
  check(
    "恢复窗口不修改队列",
    JSON.stringify(fixtureState.BCP_PLAY) === beforeQueue,
  );
  // Exercise hostile API text through the actual renderer, never execute it.
  const injected = {
    bvid: "BV_TEST_ESCAPE",
    title: '<img src=x onerror="window.fixtureXSS=true">',
    cover: "javascript:alert(1)",
  };
  fixtureState.BCP_PLAY.originalList.push(injected);
  fixtureState.BCP_PLAY.currentList.push(injected);
  $("restore").click();
  check(
    "外部标题作为文本渲染",
    !window.fixtureXSS &&
      document.querySelector('[data-bvid="BV_TEST_ESCAPE"] .bcp-item-title')
        .textContent === injected.title,
  );
  hostDialogStyle.remove();
  return results;
};
