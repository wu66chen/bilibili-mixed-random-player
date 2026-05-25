// ==UserScript==
// @name         B站收藏夹混合随机播放器
// @namespace    http://tampermonkey.net/
// @version      1.2
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

(function() {
    'use strict';

    // --- 若是通过自动切集进入的页面，强制从0秒开始播放 ---
    if (new URLSearchParams(window.location.search).get('bcp_start') === '1') {
        let forced = false;
        let videoJumper = setInterval(() => {
            let video = document.querySelector('.bpx-player-video-area video, #bilibili-player video, video');
            if (video && video.readyState >= 1) {
                // 如果B站尝试读取历史进度(跳到大于2秒)，强行将其拉回0秒
                if (video.currentTime > 2 && !forced) {
                    video.currentTime = 0;
                    forced = true;
                    clearInterval(videoJumper);
                } else if (video.currentTime > 0 && video.currentTime <= 2) {
                    forced = true;
                    clearInterval(videoJumper);
                }
            }
        }, 50);
        setTimeout(() => clearInterval(videoJumper), 5000); // 5秒后停止检测
    }

    // --- 状态管理 ---
    let uiState = GM_getValue('BCP_UI', null);
    if (!uiState || !uiState.version || uiState.version < 4.7) {
        let oldTheme = uiState ? uiState.theme : 'dark';
        uiState = {
            version: 4.7,
            width: 420, height: 620,
            collapsed: true,
            theme: oldTheme || 'dark',
            ballX: window.innerWidth - 70,
            ballY: Math.max(0, Math.floor(window.innerHeight / 2 - 26))
        };
        uiState.x = Math.max(0, uiState.ballX - uiState.width + 52);
        uiState.y = Math.max(0, Math.floor(window.innerHeight / 2 - 280));
        GM_setValue('BCP_UI', uiState);
    }

    let playState = GM_getValue('BCP_PLAY', {
        originalList: [], currentList: [], currentIndex: -1, isPlaying: false, folderNames: [], folders: []
    });
    if (!playState.folderNames) playState.folderNames = [];
    if (!playState.folders) playState.folders = [];
    if (playState.currentIndex === undefined) playState.currentIndex = -1;

    function savePlayState() { GM_setValue('BCP_PLAY', playState); renderList(); }
    function saveUIState() { GM_setValue('BCP_UI', uiState); }

    GM_addValueChangeListener('BCP_PLAY', function(name, old_value, new_value, remote) {
        if (remote) { playState = new_value; renderList(); }
    });

    // --- 注册油猴菜单，一键重置位置 ---
    GM_registerMenuCommand("⚙️ 找不到悬浮窗？点我重置位置", function() {
        uiState.width = 420; uiState.height = 620;
        uiState.ballX = window.innerWidth - 70;
        uiState.ballY = Math.max(0, Math.floor(window.innerHeight / 2 - 26));
        uiState.x = uiState.ballX - uiState.width + 52;
        uiState.y = Math.max(0, Math.floor(window.innerHeight / 2 - 280));
        uiState.collapsed = true;
        saveUIState();
        initUI();
        alert("✅ 已经将悬浮窗和悬浮球恢复到默认初始位置！");
    });

    // --- 主题与设计语言 CSS ---
    const css = `
        :root {
            --bcp-bg: rgba(28, 28, 30, 0.75); --bcp-border: rgba(255, 255, 255, 0.15);
            --bcp-text: #f5f5f7; --bcp-text-sec: #a1a1a6; --bcp-accent: #0a84ff;
            --bcp-hover: rgba(255, 255, 255, 0.1); --bcp-btn-bg: rgba(255, 255, 255, 0.08);
            --bcp-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            --bcp-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
        }

        /* 亮色主题 - 已进行对比度微调提升 */
        [data-bcp-theme="light"] {
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
        [data-bcp-theme="acnh"] {
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
            transition: opacity 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        #bcp-window.hidden { opacity: 0; pointer-events: none; transform: scale(0.95); }

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
        #bcp-ball.hidden { opacity: 0; pointer-events: none; transform: scale(0.5); }

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

    const html = `
        <div id="bcp-ball" class="hidden">
            <div id="bcp-ball-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
            <div id="bcp-ball-tooltip">
                <div class="bcp-tt-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bcp-accent)" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> B站收藏夹混合播放器</div>
                <div class="bcp-tt-row"><span class="bcp-tt-label">📁 已载入:</span><span class="bcp-tt-val" id="bcp-tt-folders">暂无</span></div>
                <div class="bcp-tt-row"><span class="bcp-tt-label">▶️ 正在播放:</span><span class="bcp-tt-val highlight" id="bcp-tt-playing">等待选择播放...</span></div>
            </div>
        </div>

        <div id="bcp-window">
            <div class="bcp-header" id="bcp-drag-handle">
                <div id="bcp-collapse-btn" title="收起为悬浮球"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg></div>
                <div class="bcp-header-center"><div class="bcp-header-title">混合播放列表 (<span id="bcp-count">0</span>)</div><div class="bcp-header-subtitle" id="bcp-folder-names">暂无收藏夹</div></div>
                <div style="width:28px;"></div>
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

            <div class="bcp-list-container" id="bcp-list"></div>

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
    `;

    const style = document.createElement('style'); style.innerHTML = css; document.head.appendChild(style);
    const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper);

    const win = document.getElementById('bcp-window'); const ball = document.getElementById('bcp-ball');
    const dragHandle = document.getElementById('bcp-drag-handle'); const collapseBtn = document.getElementById('bcp-collapse-btn');
    const listEl = document.getElementById('bcp-list'); const addCurrentBtn = document.getElementById('bcp-add-current');

    // --- 主题切换逻辑（自定义下拉菜单） ---
    const themeBtn = document.getElementById('bcp-theme-btn');
    const themeMenu = document.getElementById('bcp-theme-menu');
    const themeNames = { 'dark': '暗色', 'light': '亮色', 'acnh': '动森' };

    if (themeBtn && themeMenu) {
        // 初始化按钮文字
        themeBtn.innerHTML = ` ${themeNames[uiState.theme || 'dark']} ▾`;

        themeBtn.onclick = (e) => {
            e.stopPropagation();
            // 打开主题菜单时，自动关闭跳转菜单
            document.getElementById('bcp-jump-menu')?.classList.remove('show');
            themeMenu.classList.toggle('show');
            // 标记当前选中的主题样式
            themeMenu.querySelectorAll('.bcp-theme-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-theme') === (uiState.theme || 'dark'));
            });
        };

        themeMenu.addEventListener('click', (e) => {
            let item = e.target.closest('.bcp-theme-item');
            if (item) {
                uiState.theme = item.getAttribute('data-theme');
                saveUIState();
                document.documentElement.setAttribute('data-bcp-theme', uiState.theme);
                themeBtn.innerHTML = ` ${themeNames[uiState.theme]} ▾`;
                themeMenu.classList.remove('show');
            }
        });
    }

    // --- 初始化 UI 防走丢安全边界检测 ---
    function initUI() {
        let vw = window.innerWidth;
        let vh = window.innerHeight;

        if (typeof uiState.width !== 'number' || isNaN(uiState.width)) uiState.width = 420;
        if (typeof uiState.height !== 'number' || isNaN(uiState.height)) uiState.height = 620;

        // 如果页面已正常加载出尺寸，执行边界纠正防止乱跑
        if (vw > 100 && vh > 100) {
            uiState.width = Math.max(320, Math.min(uiState.width, vw - 20));
            uiState.height = Math.max(400, Math.min(uiState.height, vh - 20));

            if (typeof uiState.x !== 'number' || isNaN(uiState.x) || uiState.x > vw || uiState.x + uiState.width < 0) {
                uiState.x = Math.max(0, vw - uiState.width - 20);
            }
            if (typeof uiState.y !== 'number' || isNaN(uiState.y) || uiState.y > vh || uiState.y + uiState.height < 0) {
                uiState.y = Math.max(0, Math.floor(vh / 2 - uiState.height / 2));
            }

            if (typeof uiState.ballX !== 'number' || isNaN(uiState.ballX) || uiState.ballX > vw || uiState.ballX + 52 < 0) {
                uiState.ballX = vw - 70;
            }
            if (typeof uiState.ballY !== 'number' || isNaN(uiState.ballY) || uiState.ballY > vh || uiState.ballY + 52 < 0) {
                uiState.ballY = Math.max(0, Math.floor(vh / 2 - 26));
            }
        }

        win.style.width = uiState.width + 'px'; win.style.height = uiState.height + 'px';
        win.style.left = uiState.x + 'px'; win.style.top = uiState.y + 'px';
        ball.style.left = uiState.ballX + 'px'; ball.style.top = uiState.ballY + 'px';
        updateBallPositionClass();

        if (uiState.collapsed) { win.classList.add('hidden'); ball.classList.remove('hidden'); }
        else { win.classList.remove('hidden'); ball.classList.add('hidden'); }

        document.documentElement.setAttribute('data-bcp-theme', uiState.theme || 'dark');
    }
    initUI();

    new ResizeObserver(entries => { for (let entry of entries) { uiState.width = entry.contentRect.width; uiState.height = entry.contentRect.height; saveUIState(); } }).observe(win);

    function makeDraggable(element, handle, onDragEnd) {
        let isDragging = false; let offsetX, offsetY;
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, svg, #bcp-collapse-btn, a, select, .bcp-dropdown-menu')) return;
            isDragging = true; offsetX = e.clientX - element.getBoundingClientRect().left; offsetY = e.clientY - element.getBoundingClientRect().top;
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let nx = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - element.offsetWidth));
            let ny = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - element.offsetHeight));
            element.style.left = nx + 'px'; element.style.top = ny + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; document.body.style.userSelect = ''; if(onDragEnd) onDragEnd(element.offsetLeft, element.offsetTop); }
        });
    }

    makeDraggable(win, dragHandle, (x, y) => { uiState.x = x; uiState.y = y; saveUIState(); });

    function updateBallPositionClass() { if (uiState.ballX < window.innerWidth / 2) ball.classList.add('ball-left'); else ball.classList.remove('ball-left'); }

    // 双击顶栏直接收起（自定义更短频率的极速判定）
    let lastClickTime = 0;
    dragHandle.addEventListener('click', (e) => {
        if (e.target.closest('button, svg, #bcp-collapse-btn, a, select, .bcp-dropdown-menu')) return;
        let currentTime = new Date().getTime();
        if (currentTime - lastClickTime < 250) { // 250毫秒的严格双击判定窗口
            collapseBtn.click();
            lastClickTime = 0;
        } else {
            lastClickTime = currentTime;
        }
    });

    // --- 下拉菜单跳转逻辑 ---
    const jumpBtn = document.getElementById('bcp-jump-btn');
    const jumpMenu = document.getElementById('bcp-jump-menu');
    if (jumpBtn && jumpMenu) {
        jumpBtn.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('bcp-theme-menu')?.classList.remove('show'); // 打开跳转菜单时关闭主题菜单
            jumpMenu.classList.toggle('show');
            if (jumpMenu.classList.contains('show')) {
                jumpMenu.innerHTML = '';
                if (playState.folders && playState.folders.length > 0) {
                    playState.folders.forEach(f => {
                        let a = document.createElement('a');
                        a.className = 'bcp-jump-item';
                        // 使用已存储的收藏夹URL作为跳转链接，在新标签页打开
                        a.href = f.url || `https://space.bilibili.com/${window.__INITIAL_STATE__?.mid || ''}/favlist?fid=${f.fid}`;
                        a.target = '_blank';
                        a.innerText = f.name;
                        a.title = f.name;
                        jumpMenu.appendChild(a);
                    });
                } else {
                    jumpMenu.innerHTML = '<div class="bcp-jump-empty">暂无载入收藏夹</div>';
                }
            }
        };

        // 全局点击外部自动关闭所有下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.bcp-dropdown')) {
                document.querySelectorAll('.bcp-dropdown-menu').forEach(menu => menu.classList.remove('show'));
            }
        });
    }

    let ballDragging = false; let ballClickPrevent = false;
    ball.addEventListener('mousedown', (e) => {
        ballDragging = true; ballClickPrevent = false;
        let ox = e.clientX - ball.getBoundingClientRect().left; let oy = e.clientY - ball.getBoundingClientRect().top;
        const move = (em) => {
            if (Math.abs(em.clientX - (ox + ball.getBoundingClientRect().left)) > 3 || Math.abs(em.clientY - (oy + ball.getBoundingClientRect().top)) > 3) ballClickPrevent = true;
            let nx = Math.max(0, Math.min(em.clientX - ox, window.innerWidth - 52));
            let ny = Math.max(0, Math.min(em.clientY - oy, window.innerHeight - 52));
            ball.style.left = nx + 'px'; ball.style.top = ny + 'px';
            uiState.ballX = nx; updateBallPositionClass();
        };
        const up = () => {
            ballDragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
            uiState.ballX = ball.offsetLeft; uiState.ballY = ball.offsetTop; saveUIState();
        };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });

    // --- 核心逻辑：独立坐标，收起展开定位绑定 ---

    // 1. 收起面板：让悬浮球精确对齐到“缩小键”的正中间
    collapseBtn.onclick = () => {
        uiState.collapsed = true;

        let vw = window.innerWidth || 1000;
        let vh = window.innerHeight || 1000;

        // 获取缩小按钮的实际屏幕坐标，计算其中心点，然后减去悬浮球一半的宽高(26px)
        let btnRect = collapseBtn.getBoundingClientRect();
        uiState.ballX = btnRect.left + btnRect.width / 2 - 26;
        uiState.ballY = btnRect.top + btnRect.height / 2 - 26;

        uiState.ballX = Math.max(0, Math.min(uiState.ballX, vw - 52));
        uiState.ballY = Math.max(0, Math.min(uiState.ballY, vh - 52));
        ball.style.left = uiState.ballX + 'px'; ball.style.top = uiState.ballY + 'px';

        saveUIState();
        win.classList.add('hidden'); ball.classList.remove('hidden');
        updateBallPositionClass();
    };

    // 2. 展开面板：悬浮窗展开时，反向将缩小键对齐到悬浮球的位置
    ball.onclick = (e) => {
        if (ballClickPrevent) return;
        uiState.collapsed = false;

        // 先移除 hidden，使其加入渲染树从而能获取到精准的宽高坐标 (同一事件循环中计算不会产生闪烁)
        win.classList.remove('hidden'); ball.classList.add('hidden');

        let vw = window.innerWidth || 1000;
        let vh = window.innerHeight || 1000;

        // 计算缩小键相对于窗口左上角的内部偏移量
        let btnRect = collapseBtn.getBoundingClientRect();
        let winRect = win.getBoundingClientRect();
        let offsetX = (btnRect.left + btnRect.width / 2) - winRect.left;
        let offsetY = (btnRect.top + btnRect.height / 2) - winRect.top;

        // 反向推导窗口的新坐标，使缩小键精确落在原悬浮球的中心位置 (ballX+26, ballY+26)
        uiState.x = Math.max(0, Math.min(uiState.ballX + 26 - offsetX, vw - uiState.width));
        uiState.y = Math.max(0, Math.min(uiState.ballY + 26 - offsetY, vh - uiState.height));

        win.style.left = uiState.x + 'px'; win.style.top = uiState.y + 'px';

        saveUIState();
    };

    // --- 数据抓取与播放控制逻辑 ---
    function getCurrentFid() { let match = window.location.href.match(/fid=(\d+)/) || window.location.href.match(/ml(\d+)/); return match ? match[1] : null; }
    setInterval(() => { let fid = getCurrentFid(); if (fid) { addCurrentBtn.style.display = 'flex'; addCurrentBtn.innerHTML = `➕ 将当前收藏夹 (FID:${fid}) 加入列表`; } else addCurrentBtn.style.display = 'none'; }, 1000);

    async function fetchFav(fid) {
        let pn = 1; let validList = []; let invalidCount = 0; let hasMore = true; let folderName = '未知收藏夹';
        addCurrentBtn.innerText = '正在抓取，请稍候...'; addCurrentBtn.disabled = true;
        while (hasMore) {
            try {
                let res = await fetch(`https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fid}&pn=${pn}&ps=20`, {credentials: 'include'});
                let json = await res.json(); if (json.code !== 0) break;
                if (pn === 1 && json.data && json.data.info) folderName = json.data.info.title;
                for (let m of json.data.medias || []) {
                    if (m.title.includes('已失效') || m.title === '已失效视频') invalidCount++;
                    else { let cover = m.cover || m.pic || ''; if(cover && cover.startsWith('http')) cover += '@160w_100h_1c.webp'; validList.push({ bvid: m.bvid, title: m.title, cover: cover }); }
                }
                hasMore = json.data.has_more; pn++; if (pn > 100) break; await new Promise(r => setTimeout(r, 200));
            } catch (e) { break; }
        }
        addCurrentBtn.innerText = '➕ 将当前收藏夹加入列表'; addCurrentBtn.disabled = false; return { validList, invalidCount, folderName };
    }

    addCurrentBtn.onclick = async () => {
        let fid = getCurrentFid(); if (!fid) return;
        let currentUrl = window.location.href;
        let { validList, invalidCount, folderName } = await fetchFav(fid);
        if (validList.length === 0 && invalidCount === 0) return alert('未读取到视频，请检查私密状态。');
        playState.originalList = playState.originalList.concat(validList); playState.currentList = playState.currentList.concat(validList);
        if (!playState.folderNames.includes(folderName)) playState.folderNames.push(folderName);

        if (!playState.folders) playState.folders = [];
        if (!playState.folders.find(f => f.fid === fid)) {
            playState.folders.push({ fid, name: folderName, url: currentUrl });
        }
        savePlayState();
        alert(`载入成功！\n✅ 加入 ${validList.length} 个视频。\n🗑 拦截 ${invalidCount} 个失效视频！`);
    };

    document.getElementById('bcp-shuffle').onclick = () => {
        if (!playState.originalList.length) return;
        let currentVideo = null; if (playState.currentList.length > 0 && playState.currentIndex !== -1 && playState.currentIndex < playState.currentList.length) { currentVideo = playState.currentList[playState.currentIndex]; }
        let pool = [...playState.originalList];
        if (currentVideo) { let idx = pool.findIndex(v => v.bvid === currentVideo.bvid); if (idx > -1) pool.splice(idx, 1); }
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        if (currentVideo) { playState.currentList = [currentVideo, ...pool]; playState.currentIndex = 0; } else playState.currentList = pool;
        savePlayState();
    };

    document.getElementById('bcp-restore').onclick = () => {
        if (!playState.originalList.length) return;
        let currentVideo = playState.currentIndex !== -1 ? playState.currentList[playState.currentIndex] : null;
        playState.currentList = [...playState.originalList];
        if (currentVideo) { let newIdx = playState.currentList.findIndex(v => v.bvid === currentVideo.bvid); playState.currentIndex = newIdx > -1 ? newIdx : -1; } else playState.currentIndex = -1;
        savePlayState();
    };

    document.getElementById('bcp-clear').onclick = () => {
        if(confirm('确定要清空混合播放列表吗？')) {
            playState.originalList = []; playState.currentList = [];
            playState.currentIndex = -1; playState.isPlaying = false;
            playState.folderNames = []; playState.folders = [];
            savePlayState();
        }
    };

    function renderList() {
        document.getElementById('bcp-count').innerText = playState.currentList.length;

        let folderHtml = '';
        if (playState.folders && playState.folders.length > 0) {
            folderHtml = playState.folders.map(f => `<a href="${f.url || '#'}" target="_blank" style="color:inherit;text-decoration:underline;">${f.name}</a>`).join('、');
        } else if (playState.folderNames && playState.folderNames.length > 0) {
            folderHtml = playState.folderNames.join('、');
        } else {
            folderHtml = '暂无收藏夹';
        }
        document.getElementById('bcp-folder-names').innerHTML = folderHtml;
        document.getElementById('bcp-tt-folders').innerText = (playState.folders && playState.folders.length > 0) ? playState.folders.map(f=>f.name).join('、') : (playState.folderNames.length > 0 ? playState.folderNames.join('、') : '暂无收藏夹');

        if (playState.currentList.length === 0) { listEl.innerHTML = `<div style="padding:60px 20px; text-align:center; color:var(--bcp-text-sec); opacity:0.8;">列表空空如也，去收藏夹页面添加吧</div>`; }
        else {
            let html = '';
            playState.currentList.forEach((item, index) => {
                let isActive = (playState.currentIndex !== -1 && index === playState.currentIndex) ? 'active' : '';
                html += `<div class="bcp-item ${isActive}" data-index="${index}"><img class="bcp-item-cover" src="${item.cover}" referrerpolicy="no-referrer"><div class="bcp-item-info"><div class="bcp-item-title" title="${item.title}">${item.title}</div><div class="bcp-item-meta">第 ${index + 1} 首</div></div><div class="bcp-item-del" data-index="${index}" title="移出列表"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div></div>`;
            });
            listEl.innerHTML = html; setTimeout(() => { let activeItem = listEl.querySelector('.active'); if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150);
        }

        let statusText = document.getElementById('bcp-status-text'); let playingTitleEl = document.getElementById('bcp-playing-title'); let ttPlayingEl = document.getElementById('bcp-tt-playing'); let playBtn = document.getElementById('bcp-play-pause');
        if (playState.currentList.length > 0) {
            if (playState.currentIndex !== -1) {
                let currentTitle = playState.currentList[playState.currentIndex]?.title || '未知视频'; statusText.innerHTML = `进度: <span style="color:var(--bcp-accent)">${playState.currentIndex + 1}</span> / ${playState.currentList.length}`; playingTitleEl.innerText = currentTitle; ttPlayingEl.innerText = currentTitle;
            } else { statusText.innerHTML = `总计: <span style="color:var(--bcp-accent)">${playState.currentList.length}</span> 首`; playingTitleEl.innerText = '等待选择播放...'; ttPlayingEl.innerText = '等待选择播放...'; }
            playBtn.innerHTML = playState.isPlaying ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        } else { statusText.innerText = '未在播放'; playingTitleEl.innerText = '等待选择播放...'; ttPlayingEl.innerText = '等待选择播放...'; playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; }
    }

    listEl.addEventListener('click', (e) => {
        let delBtn = e.target.closest('.bcp-item-del');
        if (delBtn) {
            e.stopPropagation(); let idx = parseInt(delBtn.getAttribute('data-index')); playState.currentList.splice(idx, 1);
            if (playState.currentIndex !== -1) { if (idx < playState.currentIndex) playState.currentIndex--; else if (idx === playState.currentIndex) { playState.isPlaying = false; playState.currentIndex = -1; } }
            let origIdx = playState.originalList.findIndex(v => v.bvid === playState.currentList[idx]?.bvid); if(origIdx > -1) playState.originalList.splice(origIdx, 1);
            savePlayState(); return;
        }
        let item = e.target.closest('.bcp-item'); if (item) { playState.currentIndex = parseInt(item.getAttribute('data-index')); playState.isPlaying = true; savePlayState(); jumpToCurrent(); }
    });

    // 这里通过附加 ?t=0 与 &bcp_start=1 配合前面的拦截，使得视频总是从开头播放而无视历史记录
    function jumpToCurrent() {
        let item = playState.currentList[playState.currentIndex];
        if (item) window.location.href = `https://www.bilibili.com/video/${item.bvid}?t=0&bcp_start=1`;
    }

    document.getElementById('bcp-play-pause').onclick = () => {
        if (!playState.currentList.length) return alert('列表为空！');
        if (playState.currentIndex === -1) { playState.currentIndex = 0; playState.isPlaying = true; savePlayState(); jumpToCurrent(); return; }
        let video = document.querySelector('.bpx-player-video-area video, #bilibili-player video, video');
        if (window.location.pathname.includes(playState.currentList[playState.currentIndex]?.bvid) && video) {
            if (video.paused) { video.play(); playState.isPlaying = true; } else { video.pause(); playState.isPlaying = false; } savePlayState();
        } else { playState.isPlaying = !playState.isPlaying; savePlayState(); if (playState.isPlaying) jumpToCurrent(); }
    };

    document.getElementById('bcp-next').onclick = () => {
        if (!playState.currentList.length) return; if (playState.currentIndex === -1) playState.currentIndex = 0; else if (playState.currentIndex < playState.currentList.length - 1) playState.currentIndex++; else return alert('已经是最后一首了！');
        playState.isPlaying = true; savePlayState(); jumpToCurrent();
    };

    document.getElementById('bcp-prev').onclick = () => {
        if (!playState.currentList.length) return; if (playState.currentIndex === -1) playState.currentIndex = 0; else if (playState.currentIndex > 0) playState.currentIndex--;
        playState.isPlaying = true; savePlayState(); jumpToCurrent();
    };

    setInterval(() => {
        if (playState.currentIndex === -1) return;
        let expectedBvid = playState.currentList[playState.currentIndex]?.bvid; if (!expectedBvid) return;
        if (window.location.pathname.includes(expectedBvid)) {
            let video = document.querySelector('.bpx-player-video-area video, #bilibili-player video, video');
            if (video) {
                if (video.readyState >= 2 && !video.ended) {
                    if (video.paused && playState.isPlaying) { playState.isPlaying = false; savePlayState(); } else if (!video.paused && !playState.isPlaying) { playState.isPlaying = true; savePlayState(); }
                }
                if (playState.isPlaying && (video.ended || (video.duration > 0 && video.duration - video.currentTime < 0.5))) {
                    let cp = parseInt(new URLSearchParams(window.location.search).get('p')) || window.__INITIAL_STATE__?.p || 1;
                    if (cp >= (window.__INITIAL_STATE__?.videoData?.pages?.length || 1)) {
                        playState.isPlaying = false; if (playState.currentIndex < playState.currentList.length - 1) { playState.currentIndex++; playState.isPlaying = true; savePlayState(); jumpToCurrent(); } else savePlayState();
                    }
                }
            }
        }
    }, 500);

    renderList();
})();