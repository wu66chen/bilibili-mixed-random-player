# 🎵 B站收藏夹混合随机播放器 (Bilibili Mixed Random Player)

![Version](https://img.shields.io/badge/Version-1.2-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
[![GreasyFork](https://img.shields.io/badge/GreasyFork-一键安装-red.svg)](https://greasyfork.org/zh-CN/scripts/578892)

一款专为 Bilibili 网页版深度定制的外挂级播放队列管理器。支持多收藏夹无缝混合、智能洗牌防切歌、多主题无缝切换（含深色/亮色/动森主题），并将浏览器变成极具设计感的媒体播放器。

## ✨ 核心特性 / Features

- 🎨 **多主题随心切换 (NEW)**：内置高逼格的「Apple 深色/亮色玻璃」主题，以及极其可爱圆润的「动森 (ACNH)」主题，全局实时无缝切换！
- 🚀 **历史进度强力拦截 (NEW)**：底层强杀 B 站自带的历史播放记录跳转。自动连播切歌时，永远从 0 秒完美开始，拒绝突兀跳转。
- 📂 **快捷直达与追溯 (NEW)**：混合播放找不到原列表？下拉菜单一键跳转回源收藏夹主页。
- 🖱️ **极速双击收起 (NEW)**：鼠标双击面板顶部拖拽栏，250ms 内极速坍缩为悬浮球。
- 🔀 **智能置顶洗牌**：播放中点击打乱，自动将“当前正在观看的视频”锁定在第一位，洗牌绝不打断当前播放。
- 📦 **多维度资源融合**：一键抓取提取任意 B站收藏夹，多列表完美融合为一个待播队列，内置自动剔除失效视频的“清道夫”机制。
- 🔄 **原生态双向同步**：悬浮球遥控器与 B站原生视频播放器状态毫秒级双向同步（你点网页暂停，悬浮窗同步暂停）。
- 🛸 **绝对领域防走丢**：拖拽任意摆放，悬浮球永远智能对齐，永不越界跑出屏幕；支持系统级菜单一键重置位置。

## 📸 界面预览 / Screenshots

### 🌙 暗色主题 (Dark)
<img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/window-dark.png" width="300"/> <img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-tooltip-dark.png" width="350"/>

### ☀️ 亮色主题 (Light)
<img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/window-light.png" width="300"/> <img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-tooltip-light.png" width="350"/>

### 🍃 动森主题 (ACNH)
<img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/window-acnh.png" width="300"/> <img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-tooltip-acnh.png" width="350"/>

### 🪩 迷你悬浮球 (Mini Ball)
<img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-dark.png" width="80"/> <img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-light.png" width="80"/> <img src="https://raw.githubusercontent.com/wu66chen/bilibili-mixed-random-player/main/assets/ball-acnh.png" width="80"/>

## 🚀 安装指南 / Installation

1. 确保你的浏览器已安装用户脚本管理器插件 [Tampermonkey](https://www.tampermonkey.net/) (油猴)。
2. 点击下方链接一键安装最新版脚本：
   👉 **[从 Greasy Fork 安装 (推荐)](https://greasyfork.org/zh-CN/scripts/578892)**

*(注：如果你想从源码安装，也可直接点击本仓库的 `bilibili-random-player.user.js` -> `Raw` 进行安装)*

## 📖 使用说明 / Usage

1. 打开任意 B站收藏夹页面（例如个人空间收藏夹、稍后再看等）。
2. 点击屏幕右侧悬浮球展开面板，点击蓝色按钮 **“➕ 将当前收藏夹加入列表”**。
3. 可前往多个不同的收藏夹页面继续点击加入，实现混合播放。
4. 点击列表中任意视频开始播放，面板底部的按钮可直接遥控网页播放器。
5. **主题切换**：点击面板右上角的 **“主题 ▾”** 下拉菜单即可实时切换 UI 风格。

## 📝 历史更新日志 / Changelog

**v1.2 (当前版本)**
- `Feature` 全新引入多主题系统：深色 (Dark)、亮色 (Light)、动森 (ACNH)。
- `Feature` 新增自动跳集时的“0秒强制起播”机制，完美拦截 B 站历史记录读取引起的跳秒问题。
- `Feature` 顶部新增 **“↗️ 跳转到 ▾”** 下拉菜单，可快速打开已载入的收藏夹原网址。
- `Feature` 顶栏拖拽区新增“双击极速收起”交互。
- `Optimize` 优化悬浮窗默认尺寸，调整为 420x620 以容纳更多操作按钮。

**v1.0 ~ v1.1 核心迭代回顾**
- `Feature` 悬浮球绝对坐标固定，主面板动态象限寻址展开。
- `Feature` 统一 Tooltip（提示框）与主窗口的毛玻璃透视效果。
- `Feature` 实现底栏播放按钮与网页原生 video 元素的双向状态同步。
- `Fix` 解决调整窗口缩放导致的 UI 越界消失问题。

## 📄 许可证 / License

本项目基于 [MIT License](LICENSE) 开源。
Copyright (c) 2026 Wesley. 欢迎提交 PR 或 Issue！
