# dsh-mobile-webui

修复 dsh web GUI 在手机视口下的可用性问题（客户端插件，纯浏览器端，无构建步骤）。

> Mobile-viewport fixes for the dsh web GUI as a client plugin: full-width chat
> with an overlay drawer sidebar, swipe gestures, safe-area/dvh composer,
> code-block horizontal scrolling, 44px touch targets, and an icon-only
> composer row with a small mode · model · effort status line above the card.
> Pure browser-side, no build step, zero effect on desktop widths.

## 效果演示（360px 宽深色模式实测截图）

| 图标化 composer + 状态行 | 居中后台任务浮窗 |
|---|---|
| ![图标化 composer 与状态行](docs/composer.png) | ![居中的后台任务浮窗](docs/tasks-popover.png) |

另有七条布局层规则：①≤768px 隐藏其他插件注入的全屏背景层（`.dsh-viz-canvas` / `.dsh-viz-scrim` / `.dsh-viz-root`，不存在则自然空转）并恢复不透明页面背景——手机上可读性与续航优先；②≤768px 弹出层重锚定：composer 弹出菜单（模型/推理等级、权限模式）的锚定根改为 `position: static`，菜单钳制在 composer 卡片内；顶栏弹出层（后台任务列表等）改为以全宽的会话顶栏槽位为锚点并水平居中——原生小锚点 + `left:0`/`right:0` 在窄屏/系统显示缩放（~360 CSS px）下会把 328px 宽的浮窗推出屏幕外（实测后台任务浮窗出屏 106px）；③≤768px 会话顶栏的 Session log 下载按钮去掉文字标签并清除其 `min-width: 111px`，收成 34px 纯图标；④≤768px 支持手势：明确横向的右滑展开侧边抽屉、左滑收起（触摸移动中越过 64px 阈值即触发；竖向滚动与代码块/表格的横向滚动不受劫持，监听全部 passive）；⑤≤768px composer 底部行图标化：模型切换器隐藏文字与推理等级徽标，并注入一枚中性四角星图标（原生触发器只有文字+徽标+下拉箭头，纯图标化后必须补一枚可辨识 glyph；权限模式按钮本就随 app 规则自动纯图标），同时在输入卡片正上方注入一行 11px 小字实时显示「权限 · 模型 · 思考深度」（从隐藏的 label 读取，切换模型/模式即时更新；隐藏 label 后按钮的可访问名同步进 `aria-label`），彻底解决窄屏下两按钮重叠挤压；⑥≤768px 提问卡页脚允许换行收缩（`flex-wrap` + `margin-left:auto`）——Android 文字自动放大把「跳过本题/提交」按钮撑大后，原生 `flex-shrink:0` + `space-between` 会把提交钮推出卡片右缘裁掉（实测 38px 字体下出屏 42px，修复后换行完整可见）；⑦≤768px 会话滚动容器关闭 `scrollbar-gutter: stable`——桌面端为防滚动条抖动在右侧恒定预留 8px 槽位，导致 composer 卡片左边距 4px、右边距 12px 明显不居中；手机滚动条是覆盖式不占布局，关闭后左右各 4px 对称、消息区增宽 8px（桌面保持 stable 槽不变）。桌面端均不受影响。

所有类名钩子都做词边界锚定（`[class$="_x"]` / `[class*="_x "]`），只命中组件自身的类 token——裸子串匹配会误伤内部子元素（如 `_newSessionLabel`）。

层叠顺序（移动端）：抽屉入口 16 < 遮罩 17 < 侧边抽屉 18 < 详情抽屉 19 < shell 对话框层 20 < 菜单/设置浮层 1000——对话框永远压在抽屉之上、可点。

明确不做（留待后续版本）：工具调用折叠/bottom sheet、审批交互改造、长任务通知。

## 兼容性

- **浏览器下限**：Chrome/Edge ≥ 105、Safari ≥ 15.4、Firefox ≥ 121（需要 CSS `:has()` 与 `dvh`；`100dvh` 已带 `100%` 兜底声明）。不满足的浏览器会自动忽略对应规则、退回原生 UI——插件只增不改，不会渲染报错。
- **宿主版本**：选择器只依赖宿主的语义钩子（`data-slot` / `data-phase` / `data-sidebar-collapsed` / `data-composer-seat` / `data-conversation-scroll`）与 CSS Modules 的类名后缀（hash 前缀会变、后缀稳定）。若宿主未来大改版导致钩子落空，插件表现为静默失效（无效果、无报错），不会破坏页面。
- **显示缩放**：Android 系统「显示大小/字体放大」场景已实测覆盖（有效 CSS 宽度 ~360px 下抽屉、弹出菜单、顶栏均正常）。
- **与其他插件共存**：全屏背景层隐藏规则（`.dsh-viz-*`）在未安装对应插件时自然空转；抽屉/遮罩层叠固定在 shell 对话框层之下，不遮挡任何对话框。
- **桌面端**：全部规则限定在 ≤768px 或 `(pointer: coarse)` 媒体查询内，宽屏与鼠标指针下零影响（已回归验证）。

已知宿主行为：侧边栏内层根的宽度是宿主拖拽调整功能写入的内联 `style="width: 280px"`，移动端抽屉里用 `width: 100% !important` 覆盖以保持左右对称。

## 工作原理

前端是 hash 前缀的 CSS Modules（如 `pI_x6G_frame`），插件用稳定的选择器钩子覆盖：

- 属性钩子：`data-sidebar-collapsed` / `data-details-collapsed` / `data-slot` / `[data-composer-seat]` / `[data-phase]` / `[data-conversation-scroll]`
- 类名后缀 + 词边界锚定：`[class*="_frame"]:has(> [class*="_sidebarCol"])` 等
- 内联 `grid-template-columns` 与内联宽度用 `!important` 覆盖

DOM 干预仅四处：注入遮罩 `<div>`、抽屉入口 `<button>`、composer 状态行 `<div>`、模型触发器图标 `<span>`（显隐均纯 CSS 控制），修改 viewport meta。全部改动 ≤768px 或 coarse 指针下生效。

## 安装

在本机的 dsh web profile 中注册 bundle 并添加依赖（两处都在 `~/.dsh/profiles/web/package.json`）：

```jsonc
{
  "dsh": { "profile": { "bundles": ["...", "dsh-mobile-webui"] } },
  "dependencies": {
    // npm（推荐）：
    "dsh-mobile-webui": "^0.2.2"
    // 或 GitHub 直装：
    // "dsh-mobile-webui": "github:Odefined/dsh-mobile-webui"
  }
}
```

```bash
cd ~/.dsh/profiles/web
pnpm install
# 重启 dsh web（会中断进行中的会话，请先保存工作）
dsh web
```

重启后插件自动生效：`cordis.patch.yml` 把本包插入 Loader，`dsh.client`
声明让 client-modules 把 `client.js` 送进 web roster。

## 验证

不安装即可在运行中的页面临时验证（刷新即失效）。注意 `__ModuleLoader__.load`
只注册 factory、不执行，需手动 materialize：

```js
// Playwright run-code（或 DevTools 控制台等价操作）
await page.addScriptTag({ content: `
  window.__cap = null; const L = window.__ModuleLoader__; const orig = L.load;
  L.load = (s) => { window.__cap = s; }; window.__restore = () => { L.load = orig; };
` });
await page.addScriptTag({ path: '<本仓库路径>/client.js' });
await page.evaluate(() => {
  window.__restore();
  const mod = window.__cap.factory(() => { throw new Error('no require'); });
  mod.apply({ effect: (fn) => fn() });  // 假 ctx：立即执行 effect
});
```

视口 360×800 / 390×844 + 触屏模拟检查点：无常驻轨道、聊天列全宽、左上角原版入口按钮；
点入口 → 不透明抽屉 + 48% 遮罩；遮罩点击 / Escape / 选中会话 / 左滑 → 抽屉关闭；
右滑 → 抽屉展开；`pre`/`table` 容器内横向滚动；`(pointer: coarse)` 下图标按钮 ≥44px；
composer 行纯图标不重叠，卡片正上方状态行显示「权限 · 模型 · 思考深度」；
顶栏 Session log 按钮为 34px 纯图标；
meta viewport 含 `viewport-fit=cover` 与 `interactive-widget=resizes-content`。
桌面 ≥769px 所有规则不生效（侧边栏内联展开、入口按钮不出现、composer 文字标签保留、背景层正常）。

## 卸载

从 `~/.dsh/profiles/web/package.json` 移除 bundles 与 dependencies 两处条目，`pnpm install`，重启 `dsh web`。

## License

MIT
