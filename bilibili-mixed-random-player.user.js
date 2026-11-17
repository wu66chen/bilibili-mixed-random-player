// ==UserScript==
// @name         B站收藏夹混合随机播放器
// @namespace    http://tampermonkey.net/
// @version      1.4.12
// @description  B站网页版收藏夹随机播放，支持手动随机打乱/复原，按当前顺序播放，支持多个收藏夹混合播放。新增主题切换和多项细节优化。
// @author       Wesley
// @license      MIT
// @match        *://*.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @connect      api.bilibili.com
// @run-at       document-end
// @downloadURL https://update.greasyfork.org/scripts/578892/B%E7%AB%99%E6%94%B6%E8%97%8F%E5%A4%B9%E6%B7%B7%E5%90%88%E9%9A%8F%E6%9C%BA%E6%92%AD%E6%94%BE%E5%99%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/578892/B%E7%AB%99%E6%94%B6%E8%97%8F%E5%A4%B9%E6%B7%B7%E5%90%88%E9%9A%8F%E6%9C%BA%E6%92%AD%E6%94%BE%E5%99%A8.meta.js
// ==/UserScript==

(function () {
  "use strict";
  if (window.top !== window.self || document.getElementById("bcp-window"))
    return;
  const css = `
        #bcp-root {
            --bcp-bg: rgba(28, 28, 30, 0.75); --bcp-border: rgba(255, 255, 255, 0.15);
            --bcp-text: #f5f5f7; --bcp-text-sec: #a1a1a6; --bcp-accent: #0a84ff;
            --bcp-hover: rgba(255, 255, 255, 0.1); --bcp-btn-bg: rgba(255, 255, 255, 0.08);
            --bcp-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            --bcp-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
        }

        /* 亮色主题 - 已进行对比度微调提升 */
        #bcp-root[data-bcp-theme="light"] {
            --bcp-bg: rgba(255, 255, 255, 0.95); --bcp-border: rgba(0, 0, 0, 0.15);
            --bcp-text: #000000; --bcp-text-sec: #555555; --bcp-accent: #0062cc;
            --bcp-hover: rgba(0, 0, 0, 0.08); --bcp-btn-bg: rgba(0, 0, 0, 0.06);
            --bcp-shadow: 0 12px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08) inset;
        }
        [data-bcp-theme="light"] .bcp-actions, [data-bcp-theme="light"] .bcp-footer { background: rgba(0,0,0,0.04); }
        [data-bcp-theme="light"] .bcp-btn-primary { color: #fff; }
        [data-bcp-theme="light"] .bcp-item-cover { background: #e5e5ea; border: 1px solid rgba(0,0,0,0.05); }
        [data-bcp-theme="light"] .bcp-play-btn.primary { background: var(--bcp-accent); color: #fff; }
        [data-bcp-theme="light"] .bcp-play-btn.primary:hover { background: #005bb5; }
        [data-bcp-theme="light"] .bcp-jump-item { border-bottom: 1px solid rgba(0,0,0,0.05); }
        [data-bcp-theme="light"] .bcp-theme-item { border-bottom: 1px solid rgba(0,0,0,0.05); }

        /* 动森主题 (animal-island-ui 风格) */
        #bcp-root[data-bcp-theme="acnh"] {
            --bcp-bg: #f8f8f0; --bcp-border: #e4d8c8;
            --bcp-text: #827157; --bcp-text-sec: #a69986; --bcp-accent: #19c8b9;
            --bcp-hover: #f1ebd9; --bcp-btn-bg: #ffffff;
            --bcp-font: "M PLUS Rounded 1c", "FOT-Seurat Pro B", "Hiragino Rounded Gothic ProN", "Microsoft YaHei", sans-serif;
            --bcp-shadow: 0 12px 28px rgba(130, 113, 87, 0.15);
        }
        [data-bcp-theme="acnh"] #bcp-window { border-radius: 24px; border: 3px solid var(--bcp-border); }
        [data-bcp-theme="acnh"] #bcp-ball-inner { border: 3px solid var(--bcp-border); background: var(--bcp-bg); }
        [data-bcp-theme="acnh"] #bcp-ball-tooltip { border-radius: 20px; border: 3px solid var(--bcp-border); background: var(--bcp-bg); }
        [data-bcp-theme="acnh"] .bcp-actions, [data-bcp-theme="acnh"] .bcp-footer { background: transparent; border-color: var(--bcp-border); }
        [data-bcp-theme="acnh"] .bcp-btn { border: 2px solid var(--bcp-border); border-radius: 18px; font-weight: bold; color: var(--bcp-text); box-shadow: 0 4px 0 var(--bcp-border); transition: transform 0.1s, box-shadow 0.1s; }
        [data-bcp-theme="acnh"] .bcp-btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--bcp-border); }
        [data-bcp-theme="acnh"] .bcp-btn-primary { background: var(--bcp-accent); color: #fff; border-color: #15ab9e; box-shadow: 0 4px 0 #15ab9e; }
        [data-bcp-theme="acnh"] .bcp-btn-primary:active { box-shadow: 0 0 0 #15ab9e; }
        [data-bcp-theme="acnh"] .bcp-btn-danger { background: #ff8c78; color: #fff; border-color: #e67664; box-shadow: 0 4px 0 #e67664; }
        [data-bcp-theme="acnh"] .bcp-btn-danger:active { box-shadow: 0 0 0 #e67664; }
        [data-bcp-theme="acnh"] .bcp-play-btn { border: 2px solid var(--bcp-border); box-shadow: 0 4px 0 var(--bcp-border); background: #fff; transition: transform 0.1s, box-shadow 0.1s; }
        [data-bcp-theme="acnh"] .bcp-play-btn:hover { transform: translateY(1px); box-shadow: 0 3px 0 var(--bcp-border); background: #fff; }
        [data-bcp-theme="acnh"] .bcp-play-btn:active { transform: translateY(4px) scale(1); box-shadow: 0 0 0 var(--bcp-border); }
        [data-bcp-theme="acnh"] .bcp-play-btn.primary { background: var(--bcp-accent); color: #fff; border-color: #15ab9e; box-shadow: 0 4px 0 #15ab9e; }
        [data-bcp-theme="acnh"] .bcp-play-btn.primary:hover { background: #18bcae; transform: translateY(1px); box-shadow: 0 3px 0 #15ab9e; }
        [data-bcp-theme="acnh"] .bcp-play-btn.primary:active { transform: translateY(4px) scale(1); box-shadow: 0 0 0 #15ab9e; }
        [data-bcp-theme="acnh"] .bcp-item { border-bottom: none; margin: 6px 10px; border-radius: 16px; padding: 10px 12px; width: auto; transition: all 0.2s; border: 2px solid transparent; }
        [data-bcp-theme="acnh"] .bcp-item:hover { background: var(--bcp-hover); border-color: var(--bcp-border); }
        [data-bcp-theme="acnh"] .bcp-item.active { background: rgba(25, 200, 185, 0.12); border-color: rgba(25, 200, 185, 0.4); }
        [data-bcp-theme="acnh"] .bcp-item-cover { border-radius: 12px; box-shadow: 0 4px 10px rgba(130, 113, 87, 0.15); border: 2px solid #fff; }
        [data-bcp-theme="acnh"] .bcp-item-del { background: #ff8c78; color: #fff; border: 2px solid #e67664; box-shadow: 0 3px 0 #e67664; margin-top: -2px; }
        [data-bcp-theme="acnh"] .bcp-item-del:hover { background: #ff755f; transform: translateY(-50%) scale(1.05); }
        [data-bcp-theme="acnh"] .bcp-item-del:active { transform: translateY(calc(-50% + 3px)) scale(1.05); box-shadow: 0 0 0 transparent; }
        [data-bcp-theme="acnh"] .bcp-header { border-bottom: 2px dashed var(--bcp-border); padding-bottom: 14px; }
        [data-bcp-theme="acnh"] .bcp-actions { border-bottom: 2px dashed var(--bcp-border); }
        [data-bcp-theme="acnh"] .bcp-footer { border-top: 2px dashed var(--bcp-border); padding-top: 14px; }
        [data-bcp-theme="acnh"] .bcp-dropdown-menu { border: 3px solid var(--bcp-border); border-radius: 16px; padding: 4px; gap: 2px; }
        [data-bcp-theme="acnh"] .bcp-jump-item { border-bottom: none; border-radius: 10px; font-weight: bold; }
        [data-bcp-theme="acnh"] .bcp-jump-item:hover { background: var(--bcp-hover); }
        [data-bcp-theme="acnh"] .bcp-theme-item { border-bottom: none; border-radius: 10px; font-weight: bold; }
        [data-bcp-theme="acnh"] .bcp-theme-item:hover { background: var(--bcp-hover); }

        /* 基础样式区 */
        #bcp-window {
            position: fixed; z-index: 9999999;
            background: var(--bcp-bg); backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid var(--bcp-border); border-radius: 16px;
            box-shadow: var(--bcp-shadow);
            display: flex; flex-direction: column; font-family: var(--bcp-font); color: var(--bcp-text);
            resize: both; overflow: hidden; min-width: 320px; min-height: 400px;
            transition: opacity 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        #bcp-window.hidden { opacity: 0; pointer-events: none; }

        .bcp-header { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--bcp-border); cursor: grab; user-select: none; }
        .bcp-header:active { cursor: grabbing; }
        .bcp-header-center { display: flex; flex-direction: column; align-items: center; max-width: 60%; }
        .bcp-header-title { font-size: 15px; font-weight: 600; letter-spacing: 0.5px; pointer-events: none; }
        .bcp-header-subtitle { font-size: 11px; color: var(--bcp-text-sec); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center; }

        #bcp-collapse-btn { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: var(--bcp-text-sec); }
        #bcp-collapse-btn:hover { background: var(--bcp-hover); color: var(--bcp-text); }
        #bcp-collapse-btn svg { width: 16px; height: 16px; }

        .bcp-actions { padding: 12px 16px; border-bottom: 1px solid var(--bcp-border); background: rgba(0,0,0,0.1); }
        .bcp-btn { background: var(--bcp-btn-bg); color: var(--bcp-text); border: 1px solid transparent; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .bcp-btn:hover { background: rgba(255, 255, 255, 0.15); }
        .bcp-btn:active { transform: scale(0.96); }
        .bcp-btn-primary { background: var(--bcp-accent); color: #fff; }
        .bcp-btn-primary:hover { background: #007aff; border-color: rgba(255,255,255,0.2); }
        .bcp-btn-danger { background: rgba(255, 59, 48, 0.2); color: #ff453a; }
        .bcp-btn-auto { width: 100%; margin-bottom: 10px; font-size: 13px; font-weight: 600; }

        .bcp-list-container { flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; }
        .bcp-list-container::-webkit-scrollbar { width: 6px; }
        .bcp-list-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        .bcp-item { display: flex; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.2s; position: relative; }
        .bcp-item:hover { background: var(--bcp-hover); }
        .bcp-item.active { background: rgba(10, 132, 255, 0.15); }
        .bcp-item-cover { width: 80px; height: 50px; border-radius: 6px; object-fit: cover; margin-right: 12px; background: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .bcp-item-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
        .bcp-item-title { font-size: 13px; color: var(--bcp-text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .bcp-item-meta { font-size: 11px; color: var(--bcp-text-sec); }
        .bcp-item-del { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: rgba(255, 59, 48, 0.8); color: #fff; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 12px; opacity: 0; transition: 0.2s; }
        .bcp-item:hover .bcp-item-del { opacity: 1; }
        .bcp-item-del:hover { background: #ff453a; transform: translateY(-50%) scale(1.1); }

        .bcp-footer { padding: 12px 16px; border-top: 1px solid var(--bcp-border); background: rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: space-between; }
        .bcp-playing-info { flex: 1; overflow: hidden; margin-right: 12px; display: flex; flex-direction: column; justify-content: center; }
        .bcp-status { font-size: 12px; color: var(--bcp-text-sec); font-weight: 500; margin-bottom: 2px; }
        .bcp-playing-title { font-size: 13px; color: var(--bcp-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }

        .bcp-controls { display: flex; gap: 10px; align-items: center; }
        .bcp-play-btn { background: var(--bcp-btn-bg); color: var(--bcp-text); border: none; width: 34px; height: 34px; border-radius: 17px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .bcp-play-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .bcp-play-btn.primary { background: var(--bcp-text); color: #000; width: 40px; height: 40px; border-radius: 20px; }
        .bcp-play-btn.primary:hover { background: #fff; transform: scale(1.05); }

        #bcp-ball { position: fixed; z-index: 9999999; width: 52px; height: 52px; cursor: pointer; user-select: none; transition: opacity 0.25s, transform 0.25s; }
        #bcp-ball.hidden { opacity: 0; pointer-events: none; }

        #bcp-ball-inner {
            width: 100%; height: 100%; border-radius: 26px;
            background: var(--bcp-bg); backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid var(--bcp-border); box-shadow: 0 12px 24px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center; transition: background 0.25s, transform 0.25s;
        }
        #bcp-ball:hover #bcp-ball-inner { transform: scale(1.05); }
        #bcp-ball-inner svg { width: 24px; height: 24px; color: var(--bcp-text); }

        #bcp-ball-tooltip {
            position: absolute; top: 50%; right: calc(100% + 14px); transform: translateY(-50%) scale(0.95);
            background: var(--bcp-bg);
            backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid var(--bcp-border); border-radius: 14px; padding: 14px; width: 260px;
            box-shadow: var(--bcp-shadow);
            opacity: 0; pointer-events: none; transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
            color: var(--bcp-text); font-family: var(--bcp-font); z-index: 10;
        }
        #bcp-ball.ball-left #bcp-ball-tooltip { right: auto; left: calc(100% + 14px); }
        #bcp-ball:hover #bcp-ball-tooltip { opacity: 1; transform: translateY(-50%) scale(1); }

        .bcp-tt-title { font-size: 14px; font-weight: 600; color: var(--bcp-text); margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 6px; }
        .bcp-tt-row { display: flex; flex-direction: column; margin-bottom: 8px; }
        .bcp-tt-row:last-child { margin-bottom: 0; }
        .bcp-tt-label { color: var(--bcp-text-sec); font-size: 11px; margin-bottom: 3px; }
        .bcp-tt-val { color: var(--bcp-text); font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bcp-tt-val.highlight { color: var(--bcp-accent); }

        /* 下拉菜单基础样式 */
        .bcp-dropdown { position: relative; display: inline-block; }
        .bcp-dropdown-menu {
            position: absolute; top: calc(100% + 4px); right: 0;
            background: var(--bcp-bg); border: 1px solid var(--bcp-border);
            backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%);
            border-radius: 12px; box-shadow: var(--bcp-shadow);
            min-width: 140px; max-height: 250px; overflow-y: auto; z-index: 1000;
            opacity: 0; pointer-events: none; transform: translateY(-5px);
            transition: all 0.2s; display: flex; flex-direction: column;
        }
        .bcp-dropdown-menu::-webkit-scrollbar { width: 4px; }
        .bcp-dropdown-menu::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 2px; }
        .bcp-dropdown-menu.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .bcp-jump-item {
            padding: 8px 12px; color: var(--bcp-text); font-size: 13px; text-decoration: none;
            display: block; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bcp-jump-item:last-child { border-bottom: none; }
        .bcp-jump-item:hover { background: var(--bcp-hover); }
        .bcp-jump-empty { padding: 10px; color: var(--bcp-text-sec); font-size: 12px; text-align: center; }
        .bcp-theme-item {
            padding: 8px 12px; color: var(--bcp-text); font-size: 13px; cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center;
        }
        .bcp-theme-item:last-child { border-bottom: none; }
        .bcp-theme-item:hover { background: var(--bcp-hover); }
        .bcp-theme-item.active { color: var(--bcp-accent); font-weight: bold; }
    `;

  const icons = {
    back: "M15 18l-6-6 6-6",
    check: "M5 12l4 4L19 6",
    chevron: "M6 9l6 6 6-6",
    palette:
      "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 1-2.8h2A4 4 0 0 0 21 10a9 9 0 0 0-9-7 M7 10h.01 M10 6.5h.01 M15 7h.01",
    window: "M4 4h16v16H4z M4 9h16 M7 6.5h.01 M10 6.5h.01",
    reset: "M3 10a9 9 0 1 1 2 9 M3 4v6h6",
    music:
      "M9 18V5l12-2v13 M9 8l12-2 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  };
  const icon = (name) =>
    `<svg class="bcp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"/></svg>`;

  const launcherIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
  const html = `
        <div id="bcp-ball" class="hidden">
            <div id="bcp-ball-inner">
                ${launcherIcon}
            </div>
            <div id="bcp-ball-tooltip">
                <div class="bcp-tt-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bcp-accent)" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> B站收藏夹混合播放器</div>
                <div class="bcp-tt-row"><span class="bcp-tt-label">📁 已载入:</span><span class="bcp-tt-val" id="bcp-tt-folders">暂无</span></div>
                <div class="bcp-tt-row"><span class="bcp-tt-label">▶️ 正在播放:</span><span class="bcp-tt-val highlight" id="bcp-tt-playing">等待选择播放...</span></div>
            </div>
        </div>

        <div id="bcp-window">
            <div class="bcp-header" id="bcp-drag-handle">
                <button type="button" id="bcp-collapse-btn" title="收起为悬浮球" aria-label="收起为悬浮球">${launcherIcon}</button>
                <div class="bcp-header-center"><div class="bcp-header-title">混合播放列表 (<span id="bcp-count">0</span>)</div><div class="bcp-header-subtitle" id="bcp-folder-names">暂无收藏夹</div></div>
                <button id="bcp-settings-open" class="bcp-btn" title="外观与窗口设置">设置</button>
            </div>

            <div class="bcp-actions">
                <button id="bcp-add-current" class="bcp-btn bcp-btn-primary bcp-btn-auto" style="display:none;">➕ 将当前收藏夹加入列表</button>
                <div style="display:flex; justify-content:space-between; gap:8px;">
                    <div style="display:flex; gap:8px;">
                        <button id="bcp-shuffle" class="bcp-btn" title="打乱列表">🔀 智能打乱</button>
                        <button id="bcp-restore" class="bcp-btn">🔄 恢复原序</button>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <div class="bcp-dropdown" id="bcp-jump-dropdown">
                            <button id="bcp-jump-btn" class="bcp-btn">↗️ 跳转到 ▾</button>
                            <div class="bcp-dropdown-menu" id="bcp-jump-menu"></div>
                        </div>
                        <div class="bcp-dropdown" id="bcp-theme-dropdown">
                            <button id="bcp-theme-btn" class="bcp-btn"> 主题 ▾</button>
                            <div class="bcp-dropdown-menu" id="bcp-theme-menu" style="min-width: 80px;">
                                <div class="bcp-theme-item" data-theme="dark">暗色</div>
                                <div class="bcp-theme-item" data-theme="light">亮色</div>
                                <div class="bcp-theme-item" data-theme="acnh">动森</div>
                            </div>
                        </div>
                        <button id="bcp-clear" class="bcp-btn bcp-btn-danger">清空</button>
                    </div>
                </div>
            </div>

            <div id="bcp-notice" role="status" aria-live="polite"></div>
            <div id="bcp-list-tools"><button class="bcp-btn" id="bcp-locate">定位当前播放</button><button class="bcp-btn" id="bcp-undo" hidden>撤销移除</button></div>
            <div class="bcp-list-container" id="bcp-list"></div>
            <section id="bcp-settings" hidden aria-label="播放器设置">
              <div class="bcp-settings-heading"><button class="bcp-btn bcp-back" id="bcp-settings-back" aria-label="返回队列">${icon("back")}<span>返回队列</span></button><span class="bcp-saved">${icon("check")}即时保存</span></div>
              <h2>播放器设置</h2><p class="bcp-settings-intro">让窗口与阅读习惯更合拍，播放继续。</p>
              <section class="bcp-settings-group" aria-labelledby="bcp-appearance-title">
                <h3 id="bcp-appearance-title">${icon("palette")}外观与阅读</h3>
                <div class="bcp-setting-row"><div><span id="bcp-theme-label">主题</span><small>保留你喜欢的界面质感</small></div><button class="bcp-btn bcp-choice" id="bcp-setting-theme" data-setting="theme" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="bcp-theme-label bcp-theme-value"><span id="bcp-theme-value"></span>${icon("chevron")}</button></div>
                <div class="bcp-setting-row"><div><span id="bcp-font-label">列表字号</span><small>只调整歌曲标题大小</small></div><button class="bcp-btn bcp-choice" id="bcp-setting-font" data-setting="font" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="bcp-font-label bcp-font-value"><span id="bcp-font-value"></span>${icon("chevron")}</button></div>
                <div class="bcp-setting-row"><div><span id="bcp-density-label">列表密度</span><small>在留白与可见条目之间选择</small></div><button class="bcp-btn bcp-choice" id="bcp-setting-density" data-setting="density" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="bcp-density-label bcp-density-value"><span id="bcp-density-value"></span>${icon("chevron")}</button></div>
                <label class="bcp-setting-row bcp-switch-row" for="bcp-setting-opaque"><div><span>减少透明效果</span><small>使用实色背景，让文字更清楚</small></div><input type="checkbox" role="switch" id="bcp-setting-opaque"></label>
              </section>
              <section class="bcp-settings-group" aria-labelledby="bcp-window-title">
                <h3 id="bcp-window-title">${icon("window")}悬浮球与窗口</h3>
                <div class="bcp-setting-row"><div><span id="bcp-ball-label">悬浮球大小</span><small>拖动悬浮球可重新放置</small></div><button class="bcp-btn bcp-choice" id="bcp-setting-ball" data-setting="ball" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="bcp-ball-label bcp-ball-value"><span id="bcp-ball-value"></span>${icon("chevron")}</button></div>
                <label class="bcp-setting-row bcp-switch-row" for="bcp-setting-double"><div><span>双击顶栏收起</span><small>拖动、缩放时不会触发</small></div><input type="checkbox" role="switch" id="bcp-setting-double"></label>
                <label class="bcp-setting-row bcp-switch-row" for="bcp-setting-outside"><div><span>点击窗口外收起</span><small>菜单、确认框与移除操作不受影响</small></div><input type="checkbox" role="switch" id="bcp-setting-outside"></label>
                <p class="bcp-setting-note">拖动顶栏移动窗口，四边和四角均可调整大小。悬浮球同步跟随窗口，收起时不会重新定位。</p>
                <button class="bcp-btn bcp-reset" id="bcp-reset-layout">${icon("reset")}恢复窗口位置与大小</button><p class="bcp-setting-note">只重置窗口与悬浮球，不清空队列或修改收藏。</p>
              </section>
              <section class="bcp-settings-group bcp-playback-note"><h3>${icon("music")}播放与队列</h3><p>同 BV 合并来源；移除前会确认，移出当前项后继续播完。分 P 依次播放，一轮结束后停止。</p></section>
              <small class="bcp-settings-version">版本 1.4.12</small>
            </section>

            <div class="bcp-footer">
                <div class="bcp-playing-info">
                    <div class="bcp-status" id="bcp-status-text">总计: 0 首</div>
                    <div class="bcp-playing-title" id="bcp-playing-title" title="等待选择播放...">等待选择播放...</div>
                </div>
                <div class="bcp-controls">
                    <button class="bcp-play-btn" id="bcp-prev" title="上一首"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
                    <button class="bcp-play-btn primary" id="bcp-play-pause" title="播放/暂停"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
                    <button class="bcp-play-btn" id="bcp-next" title="下一首"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
                </div>
            </div>
        </div>
        <dialog id="bcp-confirm" aria-labelledby="bcp-confirm-title" aria-describedby="bcp-confirm-detail"><h3 id="bcp-confirm-title"></h3><p id="bcp-confirm-song"></p><p id="bcp-confirm-detail"></p><div class="bcp-confirm-actions"><button id="bcp-confirm-cancel" class="bcp-btn">取消</button><button id="bcp-confirm-remove" class="bcp-btn bcp-btn-danger">移出队列</button></div></dialog>
    `;

  const fixes = `
      #bcp-root, #bcp-root * { box-sizing: border-box; }
      #bcp-root[hidden] { display:none !important; }
      #bcp-root.bcp-initializing #bcp-window, #bcp-root.bcp-initializing #bcp-ball { transition:none !important; }
      #bcp-root [hidden] { display: none !important; }
      #bcp-root button, #bcp-root select, #bcp-root input { font-family: inherit; }
      #bcp-root button:focus, #bcp-root [tabindex]:focus, #bcp-root select:focus, #bcp-root input:focus { outline:none !important; }
      #bcp-root button:focus-visible { background:var(--bcp-hover); text-decoration:underline; text-underline-offset:3px; }
      #bcp-root #bcp-ball:focus-visible #bcp-ball-inner > svg { transform:translate(-.75px,-.5px) scale(1.14); }
      #bcp-window { min-width: min(320px, 100vw - 16px); min-height: min(400px, 100vh - 16px); resize: none; }
      #bcp-resize { position: absolute; right: 0; bottom: 0; width: 24px; height: 24px; border: 0; background: transparent; color: var(--bcp-text-sec); cursor: nwse-resize; touch-action: none; }
      #bcp-drag-handle, #bcp-ball { touch-action: none; }
      #bcp-collapse-btn { background: transparent; border: 0; flex-shrink: 0; }
      #bcp-root .bcp-actions > div, #bcp-root .bcp-actions > div > div { flex-wrap: wrap; }
      #bcp-root .bcp-btn { white-space: nowrap; }
      #bcp-root .bcp-header, #bcp-root .bcp-footer { flex-shrink: 0; }
      #bcp-list { min-height: 50px; overflow-anchor: none; }
      #bcp-root .bcp-item-title { font-size: var(--bcp-size, 13px); }
      #bcp-root .bcp-item-info { padding-right: 24px; }
      #bcp-root .bcp-item-del { opacity: .75; border: 0; cursor: pointer; }
      #bcp-root[data-density="compact"] .bcp-item { padding-top: 5px; padding-bottom: 5px; margin-top: 0; margin-bottom: 0; }
      #bcp-root[data-density="compact"] .bcp-item-cover { width: 56px; height: 36px; }
      #bcp-list-tools { display: flex; gap: 6px; padding: 6px 16px; }
      #bcp-notice:empty { display: none; }
      #bcp-notice { font-size: 12px; line-height: 1.5; padding: 8px 16px; flex-shrink: 0; }
      #bcp-settings { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; font-size: 14px; }
      #bcp-settings h3 { margin: 16px 0; font-size: 16px; }
      #bcp-settings label { display: flex; align-items: center; gap: 10px; margin: 14px 0; }
      #bcp-settings select { margin-left: auto; padding: 6px; border-radius: 6px; background: var(--bcp-bg); color: var(--bcp-text); border: 1px solid var(--bcp-border); }
      #bcp-settings p { font-size: 12px; line-height: 1.6; margin: 12px 0; }
      #bcp-root[data-opaque="true"] #bcp-window, #bcp-root[data-opaque="true"] #bcp-ball-inner { background: #1c1c1e; backdrop-filter: none; }
      #bcp-root[data-opaque="true"][data-bcp-theme="light"] #bcp-window, #bcp-root[data-opaque="true"][data-bcp-theme="light"] #bcp-ball-inner { background: #fff; }
      #bcp-root[data-opaque="true"][data-bcp-theme="acnh"] #bcp-window, #bcp-root[data-opaque="true"][data-bcp-theme="acnh"] #bcp-ball-inner { background: #f8f8f0; }
      @media (prefers-reduced-motion: reduce) { #bcp-root * { transition: none !important; scroll-behavior: auto !important; } }
      #bcp-root { --bcp-bg:rgba(25,28,34,.94); --bcp-scroll-thumb:#778394; --bcp-scroll-track:rgba(255,255,255,.06); --bcp-control-border:rgba(255,255,255,.22); --bcp-settings-line:rgba(255,255,255,.1); }
      #bcp-root[data-bcp-theme="light"] { --bcp-scroll-thumb:#7e8995; --bcp-scroll-track:#e7ebef; --bcp-control-border:#c1c9d2; --bcp-settings-line:#dfe4e9; }
      #bcp-root[data-bcp-theme="acnh"] { --bcp-scroll-thumb:#a28f73; --bcp-scroll-track:#eee6d7; --bcp-control-border:#d5c6ae; --bcp-settings-line:#e4d8c8; --bcp-text-sec:#75664f; }
      #bcp-list, #bcp-settings { scrollbar-gutter:stable; scrollbar-width:auto; scrollbar-color:var(--bcp-scroll-thumb) var(--bcp-scroll-track); }
      #bcp-list::-webkit-scrollbar, #bcp-settings::-webkit-scrollbar { width:10px; }
      #bcp-list::-webkit-scrollbar-track, #bcp-settings::-webkit-scrollbar-track { background:var(--bcp-scroll-track); border-radius:8px; }
      #bcp-list::-webkit-scrollbar-thumb, #bcp-settings::-webkit-scrollbar-thumb { background:var(--bcp-scroll-thumb); border:2px solid transparent; background-clip:padding-box; border-radius:8px; }
      #bcp-root .bcp-icon { width:18px; height:18px; flex:none; display:block; }
      #bcp-root button { -webkit-tap-highlight-color:transparent; }
      #bcp-root .bcp-btn { gap:6px; }
      #bcp-root .bcp-resize-handle { position:fixed; z-index:10000001; border:0; border-radius:0; padding:0; background:transparent; touch-action:none; pointer-events:auto; }
      #bcp-window:not(.hidden), #bcp-ball:not(.hidden), #bcp-menu, #bcp-confirm { pointer-events:auto; }
      #bcp-root .bcp-resize-handle[data-edge="n"], #bcp-root .bcp-resize-handle[data-edge="s"] { cursor:ns-resize; }
      #bcp-root .bcp-resize-handle[data-edge="e"], #bcp-root .bcp-resize-handle[data-edge="w"] { cursor:ew-resize; }
      #bcp-root .bcp-resize-handle[data-edge="nw"], #bcp-root .bcp-resize-handle[data-edge="se"] { cursor:nwse-resize; }
      #bcp-root .bcp-resize-handle[data-edge="ne"], #bcp-root .bcp-resize-handle[data-edge="sw"] { cursor:nesw-resize; }
      #bcp-root #bcp-resize::after { content:""; position:absolute; right:5px; bottom:5px; width:6px; height:6px; border-right:2px solid var(--bcp-text-sec); border-bottom:2px solid var(--bcp-text-sec); border-radius:0 0 3px; opacity:.65; }
      #bcp-root.bcp-dragging { user-select:none; }
      #bcp-root.bcp-dragging #bcp-window, #bcp-root.bcp-dragging #bcp-ball { transition:none; }
      #bcp-ball-inner { border-radius:50%; }
      #bcp-root[data-bcp-theme="dark"] #bcp-ball-inner { background:#293b52; border:2px solid #9eb8d7; box-shadow:0 6px 20px rgba(0,0,0,.5); }
      #bcp-root[data-bcp-theme="light"] #bcp-ball-inner { background:#fff; border:2px solid #8295aa; box-shadow:0 6px 20px rgba(24,39,58,.22); }
      #bcp-root[data-bcp-theme="acnh"] #bcp-ball-inner { background:#f8f8f0; border:3px solid #9b896d; box-shadow:0 6px 18px rgba(73,60,40,.26); }
      #bcp-ball-inner > svg { display:block; width:52%; height:52%; overflow:visible; transform:translate(-.75px,-.5px); }
      #bcp-root[data-bcp-theme="dark"] #bcp-ball-inner > svg { color:#fff; }
      #bcp-root[data-bcp-theme="light"] #bcp-ball-inner > svg { color:#27384a; }
      #bcp-root[data-bcp-theme="acnh"] #bcp-ball-inner > svg { color:#087b72; }
      #bcp-root #bcp-settings { padding:20px; container-type:inline-size; }
      #bcp-root .bcp-settings-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
      #bcp-root .bcp-back { padding:6px 0; border:0; background:none; box-shadow:none; border-radius:6px; color:var(--bcp-text-sec); }
      #bcp-root .bcp-back:hover { color:var(--bcp-text); background:var(--bcp-hover); }
      #bcp-root .bcp-saved { display:flex; gap:4px; align-items:center; color:var(--bcp-text-sec); font-size:11px; white-space:nowrap; }
      #bcp-root .bcp-saved .bcp-icon { width:14px; height:14px; }
      #bcp-root #bcp-settings h2 { font:600 21px/1.3 var(--bcp-font); margin:0 0 6px; letter-spacing:0; }
      #bcp-root #bcp-settings .bcp-settings-intro { margin:0; color:var(--bcp-text-sec); font-size:12px; line-height:1.6; }
      #bcp-root .bcp-settings-group { padding:22px 0 18px; border-bottom:1px solid var(--bcp-settings-line); }
      #bcp-root #bcp-settings h3 { display:flex; gap:8px; align-items:center; margin:0 0 6px; font-size:14px; line-height:1.5; font-weight:600; }
      /* Headings need explicit tokens: host h2/h3 rules beat inherited color/font. */
      #bcp-root #bcp-settings h2, #bcp-root #bcp-settings h3 { color:var(--bcp-text) !important; font-family:var(--bcp-font) !important; font-style:normal; text-transform:none; }
      #bcp-root #bcp-settings h3 .bcp-icon { color:inherit; }
      #bcp-root[data-bcp-theme="acnh"] #bcp-settings h2, #bcp-root[data-bcp-theme="acnh"] #bcp-settings h3 { font-weight:700; }
      #bcp-root #bcp-settings .bcp-setting-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:18px; margin:0; padding:14px 0; font-size:14px; line-height:1.4; }
      #bcp-root .bcp-setting-row > div { min-width:0; }
      #bcp-root .bcp-setting-row small { display:block; font-size:11px; color:var(--bcp-text-sec); margin-top:4px; line-height:1.5; }
      #bcp-root .bcp-choice { min-width:112px; min-height:36px; padding:7px 10px; justify-content:space-between; border:1px solid var(--bcp-control-border); font-size:12px; }
      #bcp-root .bcp-choice .bcp-icon { width:14px; height:14px; color:var(--bcp-text-sec); }
      #bcp-root[data-bcp-theme="acnh"] .bcp-choice { border-width:2px; border-radius:12px; box-shadow:0 2px 0 var(--bcp-border); }
      #bcp-root .bcp-switch-row { cursor:pointer; }
      #bcp-root .bcp-switch-row input { appearance:none; -webkit-appearance:none; width:36px; height:22px; border:1px solid var(--bcp-control-border); border-radius:14px; background:var(--bcp-btn-bg); position:relative; cursor:pointer; margin:0; }
      #bcp-root .bcp-switch-row input::before { content:""; position:absolute; width:14px; height:14px; border-radius:50%; top:3px; left:3px; background:var(--bcp-text-sec); transition:transform .16s ease-out; }
      #bcp-root .bcp-switch-row input:checked { background:var(--bcp-accent); border-color:var(--bcp-accent); }
      #bcp-root .bcp-switch-row input:checked::before { transform:translateX(14px); background:#fff; }
      #bcp-root .bcp-switch-row:has(input:focus-visible) > div > span { text-decoration:underline; text-underline-offset:3px; }
      #bcp-root #bcp-settings .bcp-setting-note, #bcp-root .bcp-playback-note p { font-size:11px; line-height:1.7; color:var(--bcp-text-sec); margin:8px 0; }
      #bcp-root .bcp-reset { margin-top:8px; min-height:36px; }
      #bcp-root .bcp-settings-version { display:block; padding-top:18px; font-size:11px; color:var(--bcp-text-sec); }
      #bcp-root .bcp-menu-panel { position:fixed; z-index:10000005; transform:none; right:auto; padding:5px; gap:2px; max-height:260px; overflow:auto; scrollbar-color:var(--bcp-scroll-thumb) var(--bcp-scroll-track); transition:opacity .12s ease-out; }
      #bcp-root .bcp-menu-item { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; min-height:36px; padding:8px 10px; border:0; border-radius:7px; background:none; color:var(--bcp-text); text-align:left; font:13px/1.4 var(--bcp-font); text-decoration:none; cursor:pointer; }
      #bcp-root .bcp-menu-item > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #bcp-root .bcp-menu-item:hover, #bcp-root .bcp-menu-item:focus-visible { background:var(--bcp-hover); }
      #bcp-root .bcp-menu-item[aria-selected="true"] { color:var(--bcp-accent); font-weight:600; }
      #bcp-root[data-bcp-theme="dark"] .bcp-menu-item[aria-selected="true"] { color:#69b7ff; }
      #bcp-root[data-bcp-theme="acnh"] .bcp-menu-item[aria-selected="true"] { color:#087b72; }
      #bcp-root[data-bcp-theme="acnh"] .bcp-btn-primary, #bcp-root[data-bcp-theme="acnh"] .bcp-play-btn.primary { color:#064c45; }
      #bcp-root[data-bcp-theme="acnh"] .bcp-btn-primary:hover { background:#15b9ac; }
      #bcp-root[data-bcp-theme="acnh"] .bcp-switch-row input:checked::before { background:#064c45; }
      #bcp-root .bcp-menu-check .bcp-icon { width:16px; height:16px; }
      #bcp-root #bcp-confirm { width:min(380px,calc(100vw - 32px)); padding:24px; margin:auto; border:1px solid var(--bcp-control-border); border-radius:16px; background:var(--bcp-bg); color:var(--bcp-text); font-family:var(--bcp-font); backdrop-filter:blur(25px); box-shadow:0 18px 60px rgba(0,0,0,.3); }
      /* Host CSS can override the browser's dialog:not([open]) display rule. */
      #bcp-root #bcp-confirm:not([open]) { display:none !important; pointer-events:none !important; }
      #bcp-root #bcp-confirm[open] { display:block; position:fixed; inset:0; max-height:calc(100dvh - 32px); overflow:auto; }
      #bcp-confirm::backdrop { background:rgba(0,0,0,.3); }
      #bcp-root #bcp-confirm h3 { margin:0 0 14px; font-size:17px; line-height:1.4; }
      #bcp-root #bcp-confirm h3 { color:var(--bcp-text) !important; font-family:var(--bcp-font) !important; font-style:normal; text-transform:none; }
      #bcp-root #bcp-confirm-song { margin:0 0 10px; font-size:14px; line-height:1.5; overflow-wrap:anywhere; max-height:90px; overflow:auto; }
      #bcp-root #bcp-confirm-detail { color:var(--bcp-text-sec); font-size:12px; line-height:1.7; margin:0 0 20px; }
      #bcp-root .bcp-confirm-actions { display:flex; justify-content:flex-end; gap:10px; }
      #bcp-root[data-bcp-theme="acnh"] #bcp-confirm { background:#f8f8f0; border:3px solid var(--bcp-border); border-radius:22px; }
      @container (max-width:300px) { #bcp-root .bcp-setting-row small { max-width:145px; } #bcp-root .bcp-choice { min-width:100px; } #bcp-root #bcp-settings .bcp-setting-row { gap:10px; } }

    `;
  const defaults = {
    version: 5,
    width: 420,
    height: 620,
    collapsed: true,
    theme: "dark",
    x: Math.max(8, innerWidth - 440),
    y: 60,
    ballX: Math.max(8, innerWidth - 70),
    ballY: 80,
    font: 13,
    density: "standard",
    ball: 52,
    double: true,
    outside: false,
    opaque: false,
    direction: "right",
  };
  let ui = { ...defaults, ...GM_getValue("BCP_UI", {}) };
  // Only fields changed by this page are committed; idle pages never write layout.
  function saveUI(patch) {
    // Storage merges prevent unrelated preferences being lost. The live page's
    // geometry must not silently adopt another page's size halfway through a gesture.
    GM_setValue("BCP_UI", {
      ...defaults,
      ...GM_getValue("BCP_UI", {}),
      ...patch,
      version: 6,
    });
    ui = { ...ui, ...patch, version: 6 };
  }
  const empty = () => ({
    originalList: [],
    currentList: [],
    currentIndex: -1,
    isPlaying: false,
    folders: [],
    folderNames: [],
  });
  function normalize(state) {
    state = { ...empty(), ...state };
    const current = state.currentList[state.currentIndex]?.bvid;
    const unique = (list) => {
      const map = new Map();
      for (const item of list) {
        if (!item.bvid) continue;
        const prior = map.get(item.bvid);
        const sources = [
          ...new Map(
            [...(prior?.sources || []), ...(item.sources || [])].map((s) => [
              s.fid,
              s,
            ]),
          ).values(),
        ];
        map.set(item.bvid, { ...(prior || item), sources });
      }
      return [...map.values()];
    };
    state.originalList = unique(state.originalList);
    state.currentList = unique(state.currentList);
    state.currentIndex = current
      ? state.currentList.findIndex((v) => v.bvid === current)
      : -1;
    return state;
  }
  let state = normalize(GM_getValue("BCP_PLAY", empty()));
  function latest() {
    state = normalize(GM_getValue("BCP_PLAY", empty()));
  }
  function save() {
    GM_setValue("BCP_PLAY", state);
    render();
  }
  function current() {
    return state.detached?.item || state.currentList[state.currentIndex];
  }
  const style = document.createElement("style");
  style.textContent = css + fixes;
  document.head.appendChild(style);
  const root = document.createElement("div");
  root.id = "bcp-root";
  root.hidden = true;
  root.classList.add("bcp-initializing");
  root.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  root.innerHTML = html;
  // Like the helper, keep the floating UI outside a replaced/hidden site body.
  document.documentElement.appendChild(root);
  const $ = (id) => document.getElementById("bcp-" + id);
  const win = $("window"),
    ball = $("ball"),
    list = $("list");
  const clamp = (v, lo, hi) =>
    Math.max(lo, Math.min(Number.isFinite(v) ? v : lo, Math.max(lo, hi)));
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const safeURL = (value) => {
    try {
      const url = new URL(value, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  function notify(message) {
    $("notice").textContent = message;
  }
  // Geometry follows the helper's four-direction anchor model. The live anchor
  // moves with every panel gesture; collapsing only changes visibility.
  let geometry,
    gesture = null,
    suppressClick = false,
    gestureUntil = 0;
  let anchor = { x: ui.ballX, y: ui.ballY };
  let direction = ["up-left", "up-right", "down-left", "down-right"].includes(
    ui.direction,
  )
    ? ui.direction
    : ui.direction === "right"
      ? "down-right"
      : "down-left";
  const resizeHandles = [];
  const viewport = () => ({
    w: window.visualViewport?.width || innerWidth,
    h: window.visualViewport?.height || innerHeight,
    x: window.visualViewport?.offsetLeft || 0,
    y: window.visualViewport?.offsetTop || 0,
  });
  function fitRect(rect) {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20);
    const width = clamp(
        rect.width,
        Math.min(320, rect.width, v.w - 2 * gap),
        v.w - 2 * gap,
      ),
      height = clamp(
        rect.height,
        Math.min(400, rect.height, v.h - 2 * gap),
        v.h - 2 * gap,
      );
    return {
      x: clamp(rect.x, gap, v.w - width - gap),
      y: clamp(rect.y, gap, v.h - height - gap),
      width,
      height,
    };
  }
  function fitAnchor(point) {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20),
      size = Math.min(ui.ball, v.w - 2 * gap, v.h - 2 * gap);
    return {
      x: clamp(point.x, gap, v.w - size - gap),
      y: clamp(point.y, gap, v.h - size - gap),
      size,
    };
  }
  function anchorFromPanel() {
    const size = fitAnchor(anchor).size;
    return fitAnchor({
      x: direction.endsWith("left")
        ? geometry.x + geometry.width - size
        : geometry.x,
      y: direction.startsWith("up")
        ? geometry.y + geometry.height - size
        : geometry.y,
    });
  }
  function renderGeometry(syncAnchor = !ui.collapsed) {
    const v = viewport();
    Object.assign(win.style, {
      left: geometry.x + v.x + "px",
      top: geometry.y + v.y + "px",
      width: geometry.width + "px",
      height: geometry.height + "px",
      minWidth: Math.min(320, geometry.width) + "px",
      minHeight: Math.min(400, geometry.height) + "px",
      transformOrigin: `${direction.endsWith("left") ? "right" : "left"} ${direction.startsWith("up") ? "bottom" : "top"}`,
    });
    if (syncAnchor) anchor = anchorFromPanel();
    else anchor = fitAnchor(anchor);
    Object.assign(ball.style, {
      left: anchor.x + v.x + "px",
      top: anchor.y + v.y + "px",
      width: anchor.size + "px",
      height: anchor.size + "px",
    });
    ball.classList.toggle("ball-left", anchor.x < v.w / 2);
    const l = geometry.x + v.x,
      t = geometry.y + v.y,
      r = l + geometry.width,
      b = t + geometry.height;
    const zones = {
      n: [l + 12, t - 4, geometry.width - 24, 8],
      s: [l + 12, b - 4, geometry.width - 24, 8],
      w: [l - 4, t + 12, 8, geometry.height - 24],
      e: [r - 4, t + 12, 8, geometry.height - 24],
      nw: [l - 6, t - 6, 16, 16],
      ne: [r - 10, t - 6, 16, 16],
      sw: [l - 6, b - 10, 16, 16],
      se: [r - 10, b - 10, 16, 16],
    };
    for (const handle of resizeHandles) {
      const [x, y, width, height] = zones[handle.dataset.edge];
      Object.assign(handle.style, {
        left: x + "px",
        top: y + "px",
        width: Math.max(1, width) + "px",
        height: Math.max(1, height) + "px",
      });
      handle.hidden = ui.collapsed;
    }
  }
  // One layout snapshot owns anchor, desired size, direction and relative position.
  // Temporary viewport fitting never overwrites this user-authored snapshot.
  let savedLayout;
  function layoutSnapshot() {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20),
      a = fitAnchor(anchor);
    return {
      anchor: { x: a.x, y: a.y },
      size: { width: ui.width, height: ui.height },
      direction,
      relative: {
        x: (a.x - gap) / Math.max(1, v.w - 2 * gap - a.size),
        y: (a.y - gap) / Math.max(1, v.h - 2 * gap - a.size),
      },
    };
  }
  function restoreLayout(value) {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20),
      size = fitAnchor(anchor).size;
    anchor = value.relative
      ? fitAnchor({
          x:
            gap +
            clamp(value.relative.x, 0, 1) * Math.max(0, v.w - 2 * gap - size),
          y:
            gap +
            clamp(value.relative.y, 0, 1) * Math.max(0, v.h - 2 * gap - size),
        })
      : fitAnchor(value.anchor);
    ui.width = value.size.width;
    ui.height = value.size.height;
    direction = value.direction;
    positionFromAnchor();
  }
  function persistLayout(includeSize = false) {
    if (includeSize) {
      ui.width = geometry.width;
      ui.height = geometry.height;
    }
    savedLayout = layoutSnapshot();
    saveUI({
      x: geometry.x,
      y: geometry.y,
      ballX: anchor.x,
      ballY: anchor.y,
      direction,
      width: ui.width,
      height: ui.height,
      layout: savedLayout,
    });
  }
  function paint() {
    if (!geometry)
      geometry = fitRect({
        x: ui.x,
        y: ui.y,
        width: ui.width,
        height: ui.height,
      });
    win.classList.toggle("hidden", ui.collapsed);
    ball.classList.toggle("hidden", !ui.collapsed);
    win.inert = ui.collapsed;
    ball.inert = !ui.collapsed;
    ball.setAttribute("aria-expanded", String(!ui.collapsed));
    root.setAttribute("data-bcp-theme", ui.theme);
    root.dataset.density = ui.density;
    root.dataset.opaque = String(ui.opaque);
    root.style.setProperty("--bcp-size", ui.font + "px");
    $("theme-btn").textContent =
      ({ dark: "暗色", light: "亮色", acnh: "动森" }[ui.theme] || "主题") +
      " ▾";
    renderGeometry();
  }
  function positionFromAnchor() {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20),
      a = fitAnchor(anchor),
      desired = fitRect({ x: gap, y: gap, width: ui.width, height: ui.height });
    const room = {
      left: a.x + a.size - gap,
      right: v.w - gap - a.x,
      up: a.y + a.size - gap,
      down: v.h - gap - a.y,
    };
    const [py, px] = direction.split("-");
    const choose = (a, b, size, preferred) =>
      room[preferred] >= size
        ? preferred
        : room[a] >= size
          ? a
          : room[b] >= size
            ? b
            : room[a] >= room[b]
              ? a
              : b;
    const horizontal = choose("left", "right", desired.width, px),
      vertical = choose("up", "down", desired.height, py);
    const width = Math.min(desired.width, room[horizontal]),
      height = Math.min(desired.height, room[vertical]);
    direction = vertical + "-" + horizontal;
    anchor = a;
    geometry = {
      x: horizontal === "left" ? a.x + a.size - width : a.x,
      y: vertical === "up" ? a.y + a.size - height : a.y,
      width,
      height,
    };
  }
  function collapse() {
    closeMenu();
    gestureUntil = 0;
    suppressClick = false;
    if (!ui.layout) persistLayout();
    saveUI({ collapsed: true });
    paint();
    ball.focus({ preventScroll: true });
  }
  function expand() {
    positionFromAnchor();
    saveUI({ collapsed: false, direction, x: geometry.x, y: geometry.y });
    paint();
    $("collapse-btn").focus({ preventScroll: true });
  }
  function resetLayout() {
    const v = viewport();
    direction = "up-left";
    anchor = fitAnchor({ x: v.w - ui.ball - 20, y: v.h - ui.ball - 24 });
    saveUI({ width: 420, height: 620 });
    positionFromAnchor();
    persistLayout();
    paint();
    notify("已恢复窗口位置与大小；队列和收藏未改动。");
  }
  GM_registerMenuCommand("⚙️ 找不到悬浮窗？重置位置", () => {
    resetLayout();
    saveUI({ collapsed: false });
    paint();
  });
  $("collapse-btn").onclick = collapse;
  ball.onclick = () => {
    if (!suppressClick && Date.now() > gestureUntil) expand();
  };
  ball.tabIndex = 0;
  ball.setAttribute("role", "button");
  ball.setAttribute("aria-label", "展开混合播放列表");
  ball.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      expand();
    }
  };
  function resizedRect(rect, edge, dx, dy) {
    const v = viewport(),
      gap = Math.min(12, v.w / 20, v.h / 20),
      minW = Math.min(320, rect.width),
      minH = Math.min(400, rect.height);
    let left = rect.x,
      right = rect.x + rect.width,
      top = rect.y,
      bottom = rect.y + rect.height;
    if (edge.includes("w")) left = clamp(left + dx, gap, right - minW);
    if (edge.includes("e")) right = clamp(right + dx, left + minW, v.w - gap);
    if (edge.includes("n")) top = clamp(top + dy, gap, bottom - minH);
    if (edge.includes("s")) bottom = clamp(bottom + dy, top + minH, v.h - gap);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  function attachGesture(handle, kind, edge) {
    handle.addEventListener("pointerdown", (e) => {
      if (
        e.button !== 0 ||
        (kind === "panel" && e.target.closest("button,a,input,[role=combobox]"))
      )
        return;
      closeMenu();
      e.preventDefault();
      gesture = {
        id: e.pointerId,
        handle,
        kind,
        edge,
        startX: e.clientX,
        startY: e.clientY,
        rect: { ...geometry },
        anchor: { ...anchor },
        viewport: viewport(),
        moved: false,
      };
      suppressClick = false;
      handle.setPointerCapture(e.pointerId);
      root.classList.add("bcp-dragging");
    });
    handle.addEventListener("pointermove", (e) => {
      if (!gesture || gesture.handle !== handle || gesture.id !== e.pointerId)
        return;
      const dx = e.clientX - gesture.startX,
        dy = e.clientY - gesture.startY;
      if (Math.hypot(dx, dy) < 3 && !gesture.moved) return;
      gesture.moved = true;
      suppressClick = true;
      if (kind === "ball") {
        direction = "up-left";
        anchor = fitAnchor({
          x: gesture.anchor.x + dx,
          y: gesture.anchor.y + dy,
        });
        positionFromAnchor();
        renderGeometry(false);
      } else {
        geometry =
          kind === "resize"
            ? resizedRect(gesture.rect, edge, dx, dy)
            : fitRect({
                ...gesture.rect,
                x: gesture.rect.x + dx,
                y: gesture.rect.y + dy,
              });
        renderGeometry(true);
      }
    });
    const end = () => {
      if (!gesture || gesture.handle !== handle) return;
      const moved = gesture.moved;
      if (moved) {
        persistLayout(kind !== "ball");
        gestureUntil = Date.now();
      }
      gesture = null;
      root.classList.remove("bcp-dragging");
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      handle.addEventListener(type, end);
    window.addEventListener("blur", end);
    window.addEventListener("resize", end);
    window.visualViewport?.addEventListener("resize", end);
  }
  attachGesture($("drag-handle"), "panel");
  attachGesture(ball, "ball");
  for (const edge of ["n", "s", "w", "e", "nw", "ne", "sw", "se"]) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.id = edge === "se" ? "bcp-resize" : "bcp-resize-" + edge;
    handle.dataset.edge = edge;
    handle.className = "bcp-resize-handle";
    handle.title = "拖动调整窗口大小；方向键微调";
    handle.setAttribute(
      "aria-label",
      {
        n: "上边",
        s: "下边",
        w: "左边",
        e: "右边",
        nw: "左上角",
        ne: "右上角",
        sw: "左下角",
        se: "右下角",
      }[edge] + "调整大小",
    );
    handle.tabIndex = edge === "se" ? 0 : -1;
    root.appendChild(handle);
    resizeHandles.push(handle);
    attachGesture(handle, "resize", edge);
    handle.addEventListener("keydown", (e) => {
      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();
      geometry = resizedRect(
        geometry,
        edge,
        e.key === "ArrowLeft" ? -10 : e.key === "ArrowRight" ? 10 : 0,
        e.key === "ArrowUp" ? -10 : e.key === "ArrowDown" ? 10 : 0,
      );
      renderGeometry(true);
      persistLayout(true);
    });
  }
  $("drag-handle").addEventListener("dblclick", (e) => {
    if (
      ui.double &&
      !e.target.closest("button,a,input") &&
      !gesture &&
      Date.now() > gestureUntil &&
      !$("confirm").open
    )
      collapse();
  });
  const adaptViewport = () => {
    closeMenu();
    restoreLayout(savedLayout);
    renderGeometry(false);
  };
  window.addEventListener("resize", adaptViewport);
  window.visualViewport?.addEventListener("resize", adaptViewport);
  window.visualViewport?.addEventListener("scroll", adaptViewport);
  if (ui.layout) {
    savedLayout = ui.layout;
    restoreLayout(savedLayout);
  } else {
    // Preserve the visible legacy window once, then migrate to the single anchor model.
    if (!ui.collapsed) {
      geometry = fitRect({
        x: ui.x,
        y: ui.y,
        width: ui.width,
        height: ui.height,
      });
      anchor = anchorFromPanel();
    } else positionFromAnchor();
    savedLayout = layoutSnapshot();
  }
  paint();

  // Commit the saved state before enabling transitions: never animate from
  // the template's default expanded window during page startup.
  root.hidden = false;
  void win.offsetWidth;
  root.classList.remove("bcp-initializing");

  const settings = $("settings");
  let settingsOpen = false;
  const choices = {
    theme: [
      ["dark", "暗色"],
      ["light", "亮色"],
      ["acnh", "动森"],
    ],
    font: [
      [13, "13 px · 默认"],
      [15, "15 px"],
      [17, "17 px"],
    ],
    density: [
      ["standard", "标准"],
      ["compact", "紧凑"],
    ],
    ball: [
      [44, "44 px"],
      [52, "52 px · 默认"],
      [64, "64 px"],
    ],
  };
  function syncSettings() {
    for (const [key, options] of Object.entries(choices)) {
      $(key + "-value").textContent =
        options.find(([value]) => value === ui[key])?.[1] || String(ui[key]);
    }
    for (const key of ["double", "outside", "opaque"])
      $("setting-" + key).checked = ui[key];
  }
  function applySetting(key, value) {
    saveUI({ [key]: value });
    paint();
    if (key === "ball") persistLayout();
    syncSettings();
  }
  function receiveLayout(value) {
    if (!value?.layout || gesture) return;
    const localCollapsed = ui.collapsed;
    const changed =
      JSON.stringify(value.layout) !== JSON.stringify(savedLayout);
    const preferencesChanged = [
      "theme",
      "font",
      "density",
      "ball",
      "double",
      "outside",
      "opaque",
    ].some((key) => value[key] !== ui[key]);
    if (changed || preferencesChanged) closeMenu(true);
    ui = { ...ui, ...value, collapsed: localCollapsed };
    if (changed) {
      savedLayout = value.layout;
      restoreLayout(savedLayout);
    }
    paint();
    syncSettings();
  }
  GM_addValueChangeListener("BCP_UI", (_key, _old, value, remote) => {
    if (remote) receiveLayout(value);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) receiveLayout(GM_getValue("BCP_UI", {}));
  });
  function showSettings(open) {
    closeMenu();
    if (open) rememberView();
    settingsOpen = open;
    settings.hidden = !open;
    list.hidden = open;
    $("list-tools").hidden = open;
    root.querySelector(".bcp-actions").hidden = open;
    if (open) {
      syncSettings();
      $("settings-back").focus({ preventScroll: true });
    } else {
      restoreView(viewAnchor);
      $("settings-open").focus({ preventScroll: true });
    }
  }
  $("settings-open").onclick = () => showSettings(true);
  $("settings-back").onclick = () => showSettings(false);
  $("reset-layout").onclick = resetLayout;
  for (const key of Object.keys(choices))
    $("setting-" + key).onclick = () =>
      openMenu(
        $("setting-" + key),
        choices[key].map(([value, label]) => ({
          value,
          label,
          selected: ui[key] === value,
        })),
        (value) => applySetting(key, value),
        "listbox",
      );
  settings.addEventListener("change", (e) => {
    const key = e.target.id.replace("bcp-setting-", "");
    if (["double", "outside", "opaque"].includes(key))
      applySetting(key, e.target.checked);
  });

  // One portal menu vocabulary for source navigation, quick theme and settings.
  const menu = document.createElement("div");
  menu.id = "bcp-menu";
  menu.className = "bcp-dropdown-menu bcp-menu-panel";
  menu.hidden = true;
  root.appendChild(menu);
  let menuOwner = null;
  function closeMenu(restoreFocus = false) {
    if (typeof menuOwner === "undefined" || !menuOwner) return;
    const owner = menuOwner;
    menuOwner = null;
    menu.hidden = true;
    menu.classList.remove("show");
    owner.setAttribute("aria-expanded", "false");
    if (restoreFocus) owner.focus({ preventScroll: true });
  }
  function openMenu(trigger, options, choose, role = "menu") {
    if (menuOwner === trigger) {
      closeMenu(true);
      return;
    }
    closeMenu();
    menuOwner = trigger;
    trigger.setAttribute("aria-controls", "bcp-menu");
    trigger.setAttribute("aria-haspopup", role);
    menu.replaceChildren();
    menu.setAttribute("role", role);
    menu.setAttribute("aria-label", trigger.textContent.trim());
    for (const option of options) {
      const node = document.createElement(option.url ? "a" : "button");
      node.className = "bcp-menu-item";
      if (!option.url) node.type = "button";
      else {
        node.href = safeURL(option.url);
        node.target = "_blank";
        node.rel = "noopener noreferrer";
      }
      node.dataset.value = String(option.value ?? "");
      node.setAttribute("role", role === "listbox" ? "option" : "menuitem");
      if (role === "listbox")
        node.setAttribute("aria-selected", String(Boolean(option.selected)));
      const text = document.createElement("span");
      text.textContent = option.label;
      node.appendChild(text);
      if (option.selected) {
        const check = document.createElement("span");
        check.className = "bcp-menu-check";
        check.innerHTML = icon("check");
        node.appendChild(check);
      }
      node.onclick = () => {
        closeMenu(true);
        if (choose) choose(option.value);
      };
      menu.appendChild(node);
    }
    if (!options.length) {
      const empty = document.createElement("div");
      empty.className = "bcp-jump-empty";
      empty.textContent = "暂无载入收藏夹";
      menu.appendChild(empty);
    }
    menu.hidden = false;
    menu.classList.add("show");
    trigger.setAttribute("aria-expanded", "true");
    const v = viewport(),
      r = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(180, r.width), v.w - 16);
    menu.style.width = width + "px";
    menu.style.minWidth = "0";
    menu.style.maxHeight = Math.min(260, v.h - 16) + "px";
    const h = menu.offsetHeight;
    menu.style.left =
      clamp(r.right - width, v.x + 8, v.x + v.w - width - 8) + "px";
    menu.style.top =
      clamp(
        r.bottom + h + 6 <= v.y + v.h - 8 ? r.bottom + 6 : r.top - h - 6,
        v.y + 8,
        v.y + v.h - h - 8,
      ) + "px";
    (
      menu.querySelector('[aria-selected="true"]') ||
      menu.querySelector("button,a")
    )?.focus({ preventScroll: true });
  }
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll("button,a")],
      i = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      closeMenu(true);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const n =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? items.length - 1
            : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[n]?.focus();
    } else if (e.key === "Tab") closeMenu();
  });
  settings.addEventListener("scroll", () => closeMenu(), { passive: true });
  $("theme-btn").onclick = () =>
    openMenu(
      $("theme-btn"),
      choices.theme.map(([value, label]) => ({
        value,
        label,
        selected: value === ui.theme,
      })),
      (value) => applySetting("theme", value),
      "listbox",
    );
  $("jump-btn").onclick = () => {
    latest();
    openMenu(
      $("jump-btn"),
      state.folders.map((f) => ({ label: f.name, url: f.url })),
      null,
    );
  };
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || $("confirm").open) return;
    if (menuOwner) {
      closeMenu(true);
      return;
    }
    if (settingsOpen) showSettings(false);
    else collapse();
  });
  document.addEventListener(
    "pointerdown",
    (e) => {
      const inside = e.composedPath().includes(root);
      if (
        menuOwner &&
        !e.composedPath().includes(menu) &&
        !e.composedPath().includes(menuOwner)
      )
        closeMenu();
      if (
        e.button === 0 &&
        !inside &&
        ui.outside &&
        !ui.collapsed &&
        !gesture &&
        Date.now() > gestureUntil &&
        !$("confirm").open
      )
        collapse();
    },
    true,
  );
  // Confirmation targets a stable BV, never a possibly changed list index.
  let pendingRemoval = null,
    removalReturnFocus = null;
  function requestRemoval(bvid) {
    latest();
    const item = state.currentList.find((v) => v.bvid === bvid);
    if (!item) return;
    closeMenu();
    pendingRemoval = bvid;
    removalReturnFocus = document.activeElement;
    $("confirm-title").textContent = "从混合队列移除？";
    $("confirm-song").textContent = item.title;
    $("confirm-detail").textContent =
      current()?.bvid === bvid
        ? "不会删除 B站收藏。当前视频会继续播完，再接下一项。"
        : "不会删除 B站收藏。移除后仍可撤销最近一次操作。";
    $("confirm").showModal();
    $("confirm-cancel").focus();
  }
  $("confirm-cancel").onclick = () => {
    $("confirm").close();
    pendingRemoval = null;
  };
  $("confirm-remove").onclick = () => {
    const bvid = pendingRemoval;
    $("confirm").close();
    pendingRemoval = null;
    if (bvid) remove(bvid);
  };
  $("confirm").addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    $("confirm").close();
    pendingRemoval = null;
  });
  $("confirm").addEventListener("cancel", () => {
    pendingRemoval = null;
  });
  $("confirm").addEventListener("close", () => {
    (removalReturnFocus?.isConnected ? removalReturnFocus : $("locate")).focus({
      preventScroll: true,
    });
    removalReturnFocus = null;
  });

  // Browsing position belongs to a tab, not to the globally shared playback queue.
  let savedView = {};
  try {
    savedView = JSON.parse(sessionStorage.getItem("BCP_VIEW") || "{}");
  } catch {}
  let listSignature = "",
    viewAnchor = savedView;
  function captureView() {
    if (settingsOpen) return viewAnchor;
    const rows = [...list.children];
    const row = rows.find(
      (el) => el.offsetTop + el.offsetHeight > list.scrollTop,
    );
    return {
      bvid: row?.dataset.bvid,
      offset: row ? list.scrollTop - row.offsetTop : 0,
      top: list.scrollTop,
    };
  }
  function rememberView() {
    if (!settingsOpen) {
      viewAnchor = captureView();
      try {
        sessionStorage.setItem("BCP_VIEW", JSON.stringify(viewAnchor));
      } catch {}
    }
  }
  list.addEventListener("scroll", rememberView, { passive: true });
  window.addEventListener("pagehide", rememberView);
  function restoreView(anchor) {
    const row = [...list.children].find(
      (el) => el.dataset.bvid === anchor.bvid,
    );
    list.scrollTop = row
      ? row.offsetTop + (anchor.offset || 0)
      : anchor.top || 0;
  }
  function render() {
    const signature = JSON.stringify(state.currentList);
    if (signature !== listSignature) {
      const anchor = listSignature ? captureView() : viewAnchor;
      list.innerHTML = state.currentList.length
        ? state.currentList
            .map(
              (item, index) =>
                `<div class="bcp-item" data-bvid="${esc(item.bvid)}" data-index="${index}" tabindex="0" role="button" aria-label="播放 ${esc(item.title)}"><img class="bcp-item-cover" alt="" src="${esc(safeURL(item.cover))}" referrerpolicy="no-referrer"><div class="bcp-item-info"><div class="bcp-item-title" title="${esc(item.title)}">${esc(item.title)}</div><div class="bcp-item-meta">第 ${index + 1} 首${item.sources?.length ? " · " + esc(item.sources.map((s) => s.name).join("、")) : ""}</div></div><button class="bcp-item-del" data-bvid="${esc(item.bvid)}" title="仅移出混合队列，不删除 B站收藏" aria-label="移出 ${esc(item.title)}">×</button></div>`,
            )
            .join("")
        : '<p style="padding:32px 20px;text-align:center">打开一个收藏夹，加入后再到其他收藏夹继续添加，即可混合随机播放。</p>';
      listSignature = signature;
      restoreView(anchor);
    }
    [...list.children].forEach((el, index) => {
      el.classList.toggle(
        "active",
        !state.detached && index === state.currentIndex,
      );
      el.setAttribute(
        "aria-current",
        String(!state.detached && index === state.currentIndex),
      );
    });
    $("count").textContent = state.currentList.length;
    $("folder-names").textContent =
      state.folders.map((f) => f.name).join("、") || "暂无收藏夹";
    $("tt-folders").textContent = $("folder-names").textContent;
    const item = current();
    $("playing-title").textContent = item?.title || "等待选择播放…";
    $("playing-title").title = item?.title || "";
    $("tt-playing").textContent = item?.title || "等待选择播放…";
    $("status-text").textContent = state.detached
      ? "当前项已移出 · 播完继续"
      : item
        ? `${state.isPlaying ? "正在播放" : "已暂停"} · ${state.currentIndex + 1} / ${state.currentList.length}`
        : `总计 ${state.currentList.length} 首`;
    $("play-pause").innerHTML = state.isPlaying
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    $("play-pause").setAttribute(
      "aria-label",
      state.isPlaying ? "暂停" : "播放",
    );
    $("undo").hidden = !state.undo;
  }
  $("locate").onclick = () => {
    const row = [...list.children].find(
      (el) => el.dataset.bvid === current()?.bvid,
    );
    if (row) row.scrollIntoView({ block: "nearest" });
    else
      notify(
        state.detached
          ? "当前视频已移出队列，正在等待播完。"
          : "尚未选择播放项。",
      );
  };
  function remove(bvid) {
    latest();
    const index = state.currentList.findIndex((v) => v.bvid === bvid);
    if (index < 0) return;
    const item = state.currentList[index],
      originalIndex = state.originalList.findIndex((v) => v.bvid === bvid),
      next = state.currentList[index + 1]?.bvid || null;
    state.undo = { item, index, originalIndex };
    if (current()?.bvid === bvid && !state.detached) {
      state.detached = { item, next };
      state.currentIndex = -1;
    } else if (index < state.currentIndex) state.currentIndex--;
    if (state.detached?.next === bvid) state.detached.next = next;
    state.currentList.splice(index, 1);
    state.originalList = state.originalList.filter((v) => v.bvid !== bvid);
    save();
    notify("已移出混合队列；B站收藏未改动。可撤销最近一次移除。");
  }
  $("undo").onclick = () => {
    latest();
    const undo = state.undo;
    if (!undo) return;
    const active = current()?.bvid;
    if (!state.currentList.some((v) => v.bvid === undo.item.bvid)) {
      state.currentList.splice(undo.index, 0, undo.item);
      state.originalList.splice(Math.max(0, undo.originalIndex), 0, undo.item);
    }
    if (state.detached?.item.bvid === undo.item.bvid) state.detached = null;
    state.currentIndex = state.currentList.findIndex((v) => v.bvid === active);
    state.undo = null;
    save();
    notify("已撤销移除。");
  };
  list.onclick = (e) => {
    const del = e.target.closest(".bcp-item-del");
    if (del) {
      e.stopPropagation();
      requestRemoval(del.dataset.bvid);
      return;
    }
    const row = e.target.closest(".bcp-item");
    if (row) command("select", row.dataset.bvid);
  };
  list.onkeydown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest("button")) {
      e.preventDefault();
      e.target.click();
    }
  };
  $("shuffle").onclick = () => {
    latest();
    const active = state.detached ? null : current();
    const pool = state.originalList.filter((v) => v.bvid !== active?.bvid);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    state.currentList = active ? [active, ...pool] : pool;
    state.currentIndex = active ? 0 : -1;
    save();
    notify("已打乱待播队列，当前视频继续播放。");
  };
  $("restore").onclick = () => {
    latest();
    const active = state.detached ? null : current();
    state.currentList = [...state.originalList];
    state.currentIndex = state.currentList.findIndex(
      (v) => v.bvid === active?.bvid,
    );
    save();
    notify("已恢复加入顺序，已移出的项目不会重新加入。");
  };
  $("clear").onclick = () => {
    if (
      !confirm(
        "仅清空混合队列，不删除 B站收藏。当前网页视频继续播放，播完不再接播。确定清空？",
      )
    )
      return;
    latest();
    state = { ...empty() };
    save();
    notify("混合队列已清空，B站收藏未改动。");
  };

  let loading = false;
  const fid = () => location.href.match(/(?:fid=|ml)(\d+)/)?.[1];
  function updateAdd() {
    if (loading) return;
    $("add-current").style.display = fid() ? "flex" : "none";
    $("add-current").textContent = "➕ 将当前收藏夹加入混合队列";
  }
  updateAdd();
  setInterval(updateAdd, 1000);
  $("add-current").onclick = async () => {
    const id = fid();
    if (!id || loading) return;
    loading = true;
    $("add-current").disabled = true;
    const items = [];
    let invalid = 0,
      name = "收藏夹",
      failure = "",
      hasMore = true;
    try {
      for (let pn = 1; hasMore && pn <= 100; pn++) {
        $("add-current").textContent = `正在读取第 ${pn} 页…`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(
            `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${id}&pn=${pn}&ps=20`,
            { credentials: "include", signal: controller.signal },
          );
          const json = await response.json();
          if (!response.ok || json.code !== 0 || !json.data)
            throw Error("收藏夹无法读取");
          name = json.data.info?.title || name;
          for (const m of json.data.medias || []) {
            if (!m.bvid || m.title?.includes("已失效")) invalid++;
            else
              items.push({
                bvid: m.bvid,
                title: m.title,
                cover: m.cover || m.pic || "",
                sources: [{ fid: id, name }],
              });
          }
          hasMore = Boolean(json.data.has_more);
        } finally {
          clearTimeout(timeout);
        }
        if (hasMore) await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (hasMore) failure = "已达到本次读取上限";
    } catch {
      failure = "读取中断（网络或访问权限）";
    }
    latest();
    let added = 0,
      merged = 0;
    for (const item of items) {
      const existing = state.originalList.find((v) => v.bvid === item.bvid);
      if (existing) {
        merged++;
        existing.sources = [
          ...new Map(
            [...(existing.sources || []), ...item.sources].map((s) => [
              s.fid,
              s,
            ]),
          ).values(),
        ];
        const queued = state.currentList.find((v) => v.bvid === item.bvid);
        if (queued) queued.sources = existing.sources;
      } else {
        state.originalList.push(item);
        state.currentList.push(item);
        added++;
      }
    }
    if (items.length) {
      const folder = { fid: id, name, url: location.href };
      state.folders = [...state.folders.filter((f) => f.fid !== id), folder];
      state.folderNames = state.folders.map((f) => f.name);
      save();
    }
    loading = false;
    $("add-current").disabled = false;
    updateAdd();
    notify(
      `${failure ? failure + "；已保留读到的部分。" : "读取完成。"}新增 ${added}，合并 ${merged}，过滤失效 ${invalid}。${failure ? "点击“加入”重试，会合并重复视频。" : ""}`,
    );
  };

  // A renewable owner record routes controls to one playback page. Navigation transfers
  // ownership with a single-use ticket; other tabs only browse/edit the shared queue.
  const docId = crypto.randomUUID();
  let navigating = false,
    wasOwner = false;
  const owner = () => GM_getValue("BCP_OWNER", null);
  const owns = () => owner()?.id === docId;
  const video = () =>
    document.querySelector(
      ".bpx-player-video-area video, #bilibili-player video, video",
    );
  function claim() {
    GM_setValue("BCP_OWNER", { id: docId, time: Date.now() });
    wasOwner = true;
  }
  window.addEventListener("pagehide", () => {
    if (owns() && !navigating) GM_setValue("BCP_OWNER", null);
  });
  const ticket = new URLSearchParams(location.search).get("bcp_session");
  const handoff = GM_getValue("BCP_HANDOFF", null);
  if (
    ticket &&
    handoff?.token === ticket &&
    Date.now() - handoff.time < 60000
  ) {
    if (handoff.view) viewAnchor = handoff.view;
    GM_setValue("BCP_HANDOFF", null);
    claim();
  } else if (
    current() &&
    location.pathname.includes("/video/" + current().bvid) &&
    (!owner() || Date.now() - owner().time > 15000)
  )
    claim();
  GM_addValueChangeListener("BCP_OWNER", (_n, _o, value, remote) => {
    if (remote && wasOwner && value?.id !== docId) {
      video()?.pause();
      wasOwner = false;
    }
  });
  GM_addValueChangeListener("BCP_PLAY", (_n, _o, value, remote) => {
    if (remote) {
      state = normalize(value || empty());
      render();
    }
  });
  GM_addValueChangeListener("BCP_COMMAND", (_n, _o, value, remote) => {
    if (
      remote &&
      owns() &&
      value?.owner === docId &&
      Date.now() - value.time < 10000
    )
      execute(value.action, value.bvid);
  });
  function guardDuplicatePlayback(event) {
    const item = current(),
      media = video();
    if (
      !item ||
      !media ||
      media.paused ||
      owns() ||
      !location.pathname.includes("/video/" + item.bvid)
    )
      return;
    const target = owner();
    if (target && Date.now() - target.time < 15000) {
      if (event?.target === media) event.stopImmediatePropagation();
      media.pause();
      notify(
        "该队列正在另一个标签页播放；本页已暂停副本。面板按钮可控制播放页。",
      );
    } else claim();
  }
  document.addEventListener("play", guardDuplicatePlayback, true);
  guardDuplicatePlayback();
  function jump(part = 1) {
    const item = current();
    if (!item) return;
    rememberView();
    const token = crypto.randomUUID();
    GM_setValue("BCP_HANDOFF", { token, time: Date.now(), view: viewAnchor });
    navigating = true;
    location.href = `https://www.bilibili.com/video/${encodeURIComponent(item.bvid)}?p=${part}&t=0&bcp_start=1&bcp_session=${token}`;
  }
  function command(action, bvid) {
    const target = owner();
    if (target && target.id !== docId && Date.now() - target.time < 15000) {
      GM_setValue("BCP_COMMAND", {
        owner: target.id,
        action,
        bvid,
        time: Date.now(),
        id: crypto.randomUUID(),
      });
      notify("已向播放页发送操作；播放状态由视频实际结果更新。");
    } else {
      if (!owns()) claim();
      execute(action, bvid);
    }
  }
  async function execute(action, bvid) {
    latest();
    if (navigating) return;
    if (
      action === "toggle" &&
      current() &&
      location.pathname.includes("/video/" + current().bvid) &&
      video()
    ) {
      const media = video();
      try {
        if (media.paused) await media.play();
        else media.pause();
        latest();
        state.isPlaying = !media.paused;
        save();
        notify(media.paused ? "已暂停。" : "已开始播放。");
      } catch {
        latest();
        state.isPlaying = false;
        save();
        notify("网页未能开始播放。请点 B站播放器播放键，或使用下一首跳过。");
      }
      return;
    }
    let index = state.currentIndex;
    if (action === "select")
      index = state.currentList.findIndex((v) => v.bvid === bvid);
    else if (action === "next")
      index = state.detached
        ? state.currentList.findIndex((v) => v.bvid === state.detached.next)
        : index + 1;
    else if (action === "prev") index = Math.max(0, index - 1);
    else if (index < 0) index = 0;
    if (index < 0 || index >= state.currentList.length) {
      notify("队列已结束。可选择条目重新播放。");
      return;
    }
    state.detached = null;
    state.currentIndex = index;
    state.isPlaying = false;
    save();
    jump();
  }
  $("play-pause").onclick = () => command("toggle");
  $("next").onclick = () => command("next");
  $("prev").onclick = () => command("prev");
  // Honor the initial start intent once metadata is ready; never poll-seek after the user seeks.
  let startPending =
    new URLSearchParams(location.search).get("bcp_start") === "1";
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!root.contains(e.target)) startPending = false;
    },
    true,
  );
  let endHandled = null;
  // Userscript sandboxes cannot reliably see the page's __INITIAL_STATE__.
  // Unknown metadata is not equivalent to a one-part video.
  const partMetadata = new Map();
  const retryParts = document.createElement("button");
  retryParts.id = "bcp-retry-parts";
  retryParts.className = "bcp-btn";
  retryParts.textContent = "重试分 P 信息";
  retryParts.hidden = true;
  $("list-tools").appendChild(retryParts);
  async function loadParts(bvid, retry = false) {
    if (!retry && partMetadata.has(bvid)) return;
    const record = { status: "loading", count: 0 };
    partMetadata.set(bvid, record);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
        { credentials: "include", signal: controller.signal },
      );
      const json = await response.json();
      if (
        !response.ok ||
        json.code !== 0 ||
        json.data?.bvid !== bvid ||
        !json.data.pages?.length
      )
        throw Error("Missing part metadata");
      record.count = json.data.pages.length;
      record.status = "ready";
    } catch {
      record.status = "error";
    } finally {
      clearTimeout(timeout);
    }
    if (current()?.bvid === bvid && owns()) {
      retryParts.hidden = record.status !== "error";
      if (record.status === "error")
        notify(
          "无法确认分 P 信息；播完将暂不接播。可重试分 P 信息，或手动下一首。",
        );
      if (video()?.ended) finishTrack();
    }
  }
  retryParts.onclick = () => {
    const item = current();
    if (item) {
      retryParts.hidden = true;
      loadParts(item.bvid, true);
    }
  };
  function finishTrack(event) {
    if (!owns() || navigating) return;
    latest();
    const item = current(),
      media = video();
    if (
      !item ||
      !media ||
      !media.ended ||
      !location.pathname.includes("/video/" + item.bvid)
    )
      return;
    const part = Math.max(
      1,
      Number(new URLSearchParams(location.search).get("p")) || 1,
    );
    // Consume the managed media end before native recommendations/part switching.
    if (event?.target === media) event.stopImmediatePropagation();
    const metadata = partMetadata.get(item.bvid);
    if (!metadata || metadata.status !== "ready") {
      if (state.isPlaying) {
        state.isPlaying = false;
        save();
      }
      if (!metadata) loadParts(item.bvid);
      return;
    }
    const endKey = `${item.bvid}:${part}`;
    if (endHandled === endKey) return;
    endHandled = endKey;
    if (part < metadata.count) {
      state.isPlaying = false;
      save();
      jump(part + 1);
      return;
    }
    const next = state.detached
      ? state.currentList.findIndex((v) => v.bvid === state.detached.next)
      : state.currentIndex + 1;
    state.isPlaying = false;
    if (next >= 0 && next < state.currentList.length) {
      state.detached = null;
      state.currentIndex = next;
      save();
      jump();
    } else {
      save();
      notify("本轮播放结束。");
    }
  }
  document.addEventListener("ended", finishTrack, true);
  setInterval(() => {
    guardDuplicatePlayback();
    if (!owns() || navigating) return;
    GM_setValue("BCP_OWNER", { id: docId, time: Date.now() });
    const item = current(),
      media = video();
    if (!item || !media || !location.pathname.includes("/video/" + item.bvid))
      return;
    loadParts(item.bvid);
    if (startPending && media.readyState >= 1) {
      startPending = false;
      media.currentTime = 0;
      media
        .play()
        .catch(() => notify("浏览器未允许自动播放。请点 B站播放键继续。"));
    }
    if (
      media.readyState >= 2 &&
      !media.ended &&
      state.isPlaying !== !media.paused
    ) {
      latest();
      state.isPlaying = !media.paused;
      save();
    }
    if (!media.ended) {
      endHandled = null;
      return;
    }
    finishTrack();
  }, 500);
  render();
})();
