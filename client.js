// dsh-mobile-webui — client bundle (lazy CJS format, hand-written; the package
// ships no build step). Fixes the dsh web GUI on phone-sized viewports:
//
//   R1  layout: expanded sidebar / details panel become overlay drawers over a
//       full-width chat column, instead of squeezing the grid (at 390px the
//       chat was left with ~110px — character-per-line wrapping). A scrim
//       behind the drawer closes it on tap; Escape closes it too; picking a
//       session auto-closes it.
//   R2  messages: prose wraps (overflow-wrap), code blocks / tables scroll
//       horizontally inside their container.
//   R5  composer & viewport: html/body/#root height upgraded to 100dvh, meta
//       viewport gains viewport-fit=cover + interactive-widget=resizes-content,
//       composer gets env(safe-area-inset-bottom) padding and a dvh-based text
//       height cap.
//   R6  touch: 44px minimum targets under (pointer: coarse) for sidebar,
//       composer, session-list and approval buttons. The plugin adds no :hover
//       styles of its own, so nothing can stick on touch screens.
//
// Selector strategy: the shell's CSS Modules classes are hash-prefixed but the
// local name suffix is stable (`pI_x6G_frame` → `[class*="_frame"]`), and the
// shell exposes semantic hooks (`data-sidebar-collapsed`, `data-slot`,
// `data-composer-seat`) that survive rebuilds. Class hooks are token-boundary
// anchored (`[class$="_x"]` / `[class*="_x "]`) so inner children like
// `_newSessionLabel` never match. The shell frame is identified as the
// `_frame` element that directly contains a `_sidebarCol`.

window.__ModuleLoader__.load({
  id: 'dsh-mobile-webui',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const MOBILE_QUERY = '(max-width: 768px)';
    const FRAME_SEL = "[class*='_frame']:has(> [class*='_sidebarCol'])";

    const CSS = `
/* ---- R5: dynamic viewport height (100vh fallback for old engines) ---- */
html, body, #root { height: 100%; height: 100dvh; }

/* scrim is JS-injected as a direct frame child; hidden unless a drawer is open */
.dsh-mw-scrim { display: none; }
/* hamburger only exists on phone widths (see media query below) */
.dsh-mw-burger { display: none; }

@keyframes dsh-mw-drawer-left-in { from { transform: translateX(-100%); } }
@keyframes dsh-mw-drawer-right-in { from { transform: translateX(100%); } }

@media (max-width: 768px) {
  /* Pin the three columns to explicit grid cells. When a panel leaves the
     flow (position:fixed drawer), auto-placement would otherwise slide the
     remaining columns left and put the chat column into the 0px cell. */
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_sidebarCol"] { grid-column: 1; }
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_centerCol"] { grid-column: 2; }
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_detailsCol"] { grid-column: 3; }

  /* ---- R1: no permanent rail — single full-width chat column; the sidebar
     only exists as an overlay drawer. The collapsed rail is hidden entirely;
     entry is the injected hamburger (.dsh-mw-burger). The frame sets
     grid-template-columns inline, so this needs !important. ---- */
  [class*="_frame"]:has(> [class*="_sidebarCol"]) {
    grid-template-columns: 0px minmax(0px, 1fr) 0px !important;
  }
  [class*="_frame"]:has(> [class*="_sidebarCol"])[data-sidebar-collapsed] > [class*="_sidebarCol"] {
    display: none;
  }
  [class*="_frame"]:has(> [class*="_sidebarCol"]):not([data-sidebar-collapsed]) > [class*="_sidebarCol"] {
    display: block;
    position: fixed;
    top: 0; bottom: 0; left: 0;
    width: min(85vw, 320px);
    /* below the shell overlay layer (z-20) so dialogs/menus always win over
       the drawer; above the sticky composer (z-7) */
    z-index: 18;
    /* The column's own background uses --dsw-specific-sidebar-fill, which
       themes/background plugins may force to transparent. A drawer must be
       opaque — bg-layer-1 is a plain theme token nobody hijacks. */
    background: var(--dsw-alias-bg-layer-1, Canvas);
    box-shadow: var(--dsw-shadow-lv3);
    animation: dsh-mw-drawer-left-in 0.2s var(--ds-ease-in-out, ease);
  }
  [class*="_frame"]:has(> [class*="_sidebarCol"]):not([data-details-collapsed]) > [class*="_detailsCol"] {
    position: fixed;
    top: 0; bottom: 0; right: 0;
    width: min(92vw, 360px);
    z-index: 19;
    background: var(--dsw-alias-bg-layer-1, Canvas);
    box-shadow: var(--dsw-shadow-lv3);
    animation: dsh-mw-drawer-right-in 0.2s var(--ds-ease-in-out, ease);
  }
  /* 8px col-resize handles are mouse-only furniture */
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_handle"] { display: none; }

  [class*="_frame"]:has(> [class*="_sidebarCol"]):not([data-sidebar-collapsed]) > .dsh-mw-scrim,
  [class*="_frame"]:has(> [class*="_sidebarCol"]):not([data-details-collapsed]) > .dsh-mw-scrim {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 17;
    /* mask-3 (48%) — mask-1 (24%) lets a full conversation bleed through,
       which is exactly what happens behind a drawer over an active session */
    background: var(--dsw-alias-bg-mask-3, rgba(0, 0, 0, 0.48));
    -webkit-tap-highlight-color: transparent;
  }

  /* ---- drawer entry (JS-injected). Uses the app's own sidebar panel glyph
     at the toggle's native 36px size and quiet opacity — not a new oversized
     hamburger. The scrim (z-17) covers it while a drawer is open. ---- */
  .dsh-mw-burger {
    display: grid;
    place-items: center;
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    left: calc(env(safe-area-inset-left, 0px) + 8px);
    width: 36px;
    height: 36px;
    padding: 0;
    z-index: 16;
    border: none;
    background: transparent;
    color: var(--dsw-alias-label-primary, CanvasText);
    opacity: 0.45;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* the sidebar's inner root carries the desktop sidebar width as an INLINE
     style (style="width: 280px", written by the app's resize feature); inside
     the wider mobile drawer it pinned left and left a ragged dead strip on
     the right (14px vs 41px at 360px). Let it fill the drawer so its 12px
     side paddings stay symmetric — !important is required to beat the inline
     style. The intermediate wrapper is a display:contents transition div, so
     100% resolves to the drawer width. */
  [class*="_sidebarCol"] [class$="_root"],
  [class*="_sidebarCol"] [class*="_root "] { width: 100% !important; }

  /* the session header makes room for the toggle (hero phase has no
     header, nothing to shift) */
  [data-slot="conversation.session.header"] > header { padding-left: 52px; }

  /* the Session log download button spends ~111px of the narrow top bar —
     icon-only on phones: hide the label AND drop the button's own
     min-width:111px, otherwise the box stays wide with the text invisible */
  [data-slot="conversation.session.header"] [class$="_sessionLogButton"] > span,
  [data-slot="conversation.session.header"] [class*="_sessionLogButton "] > span { display: none; }
  [data-slot="conversation.session.header"] [class$="_sessionLogButton"],
  [data-slot="conversation.session.header"] [class*="_sessionLogButton "] {
    min-width: 0;
    padding-left: 10px;
    padding-right: 10px;
  }

  /* Full-screen background layers from other plugins (a music visualizer's
     .dsh-viz-canvas/.dsh-viz-scrim plus its .dsh-viz-root floating trigger)
     are hidden on phones: readability and battery first, and the trigger
     otherwise collides with the composer's send button. No-op when no such
     plugin is installed — these classes simply won't exist. Hiding also
     idles the visualizer's render cost, since its canvas sizes itself from
     clientWidth, which is 0 while display:none. */
  .dsh-viz-canvas, .dsh-viz-scrim, .dsh-viz-root { display: none !important; }
  /* Such layers typically force the page background transparent so they can
     show through; with the layer gone the page would sit on a hole, so
     restore an opaque base from a plain theme token. */
  html body { background: var(--dsw-alias-bg-layer-1, Canvas); }

  /* Composer popover menus (model/effort picker, permission-mode picker, …)
     are absolutely anchored right:0 to their tiny trigger roots
     (_7KE1Ra_root, the shared popover's _root_* spans). On narrow or
     display-zoomed phones (~360 CSS px) root-right minus menu-width goes
     negative and the menu slides off the left edge. De-anchor the roots at
     mobile widths so menus clamp to the composer card (position:relative,
     nearly full-width) instead. */
  [data-composer-seat] [class$="_root"],
  [data-composer-seat] [class*="_root_"] { position: static; }

  /* ---- R5: composer & safe area ----
     (attribute names are the DOM dataset sources: data-composer-seat,
     data-conversation-scroll — hyphenated, not camelCase) */
  [data-phase] {
    --dsh-composer-side-clearance: 4px;
    --dsh-composer-dock-inset: 4px;
  }
  [data-composer-seat] {
    --dsh-composer-text-max-height: min(336px, 30dvh);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  [data-phase] [class$="_card"],
  [data-phase] [class*="_card "] {
    max-height: min(60vh, 520px);
    max-height: min(60dvh, 520px);
  }

  /* ---- R2: message content — wrap prose, scroll code/tables ---- */
  [data-conversation-scroll] p,
  [data-conversation-scroll] li,
  [data-conversation-scroll] a,
  [data-conversation-scroll] code { overflow-wrap: break-word; }
  [data-conversation-scroll] pre {
    max-width: 100%;
    overflow-x: auto;
  }
  [data-conversation-scroll] table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
}

/* ---- R6: 44px touch targets (Apple HIG / WCAG 2.5.5) ----
   Class hooks are token-boundary anchored ([class$="_x"] / [class*="_x "]) so
   they hit the component's own class only — plain substring matching also
   matched INNER children (_newSessionLabel / _triggerLabel spans), inflating
   them to 44x44 and breaking the buttons' icon+label flex row. */
@media (pointer: coarse) {
  [data-slot="sidebar"] [class$="_iconButton"], [data-slot="sidebar"] [class*="_iconButton "],
  [data-slot="sidebar"] [class$="_newSession"], [data-slot="sidebar"] [class*="_newSession "],
  [data-slot="sidebar"] [class$="_search"], [data-slot="sidebar"] [class*="_search "],
  [data-slot="sidebar"] [class$="_trigger"], [data-slot="sidebar"] [class*="_trigger "] {
    min-width: 44px;
    min-height: 44px;
  }
  [data-slot="sidebar"] [class$="_collapsed"] [class$="_logoRow"],
  [data-slot="sidebar"] [class$="_collapsed"] [class*="_logoRow "],
  [data-slot="sidebar"] [class*="_collapsed "] [class$="_logoRow"],
  [data-slot="sidebar"] [class*="_collapsed "] [class*="_logoRow "] {
    height: auto;
    min-height: 44px;
  }
  [class$="_sessionRow"], [class*="_sessionRow "],
  [class$="_projectRow"], [class*="_projectRow "] { min-height: 44px; }
  /* Composer: bump ONLY icon-only buttons (send, add, misc glyph buttons).
     Text-labelled triggers (model picker, mode picker) keep their native
     size — forcing them to 44px stretched the row, pushed the card over the
     status line, and worsened the label crowding at 390px. */
  [data-composer-seat] button:has(> svg:only-child),
  [data-composer-seat] button[class$="_iconButton"],
  [data-composer-seat] button[class*="_iconButton "] {
    min-width: 44px;
    min-height: 44px;
  }
  [class$="_actionRow"] button, [class*="_actionRow "] button { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_sidebarCol"],
  [class*="_frame"]:has(> [class*="_sidebarCol"]) > [class*="_detailsCol"] {
    animation: none !important;
  }
}
`;

    function findFrame() {
      try {
        return document.querySelector(FRAME_SEL);
      } catch {
        // :has() unsupported in a very old engine — manual fallback.
        for (const el of document.querySelectorAll("[class*='_frame']")) {
          for (const child of el.children) {
            if (typeof child.className === 'string' && child.className.includes('_sidebarCol')) return el;
          }
        }
        return null;
      }
    }

    function closeDrawers(frame) {
      if (!frame.hasAttribute('data-sidebar-collapsed')) {
        frame.querySelector("[class*='_sidebarCol'] [class*='_toggle']")?.click();
      }
      if (!frame.hasAttribute('data-details-collapsed')) {
        frame.querySelector("[class*='_detailsCol'] [class*='_close']")?.click();
      }
    }

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.id = 'dsh-mobile-webui';
        style.textContent = CSS;
        document.head.appendChild(style);

        // R5: extend the viewport meta. viewport-fit=cover makes
        // env(safe-area-inset-*) resolve; interactive-widget=resizes-content
        // lets Android Chrome reflow around the software keyboard (Safari
        // ignores it — WebKit bug 259770 — the dvh chain above covers iOS).
        const meta = document.querySelector('meta[name="viewport"]');
        const originalViewport = meta ? meta.getAttribute('content') : null;
        if (meta) {
          let content = originalViewport || '';
          if (!/viewport-fit=/.test(content)) content += ', viewport-fit=cover';
          if (!/interactive-widget=/.test(content)) content += ', interactive-widget=resizes-content';
          meta.setAttribute('content', content);
        }

        const mq = window.matchMedia(MOBILE_QUERY);
        const scrim = document.createElement('div');
        scrim.className = 'dsh-mw-scrim';
        scrim.setAttribute('aria-hidden', 'true');
        let scrimFrame = null;

        // Drawer entry: uses the app's own sidebar panel glyph (the same
        // panelIcon the sidebar toggle shows when expanded — a rounded square
        // with the left panel bar, direction-neutral), at the toggle's native
        // 36px size. Baked in directly: the rail swaps this icon for the
        // brand fish while collapsed, so it cannot be cloned in the state the
        // button is actually needed.
        const burger = document.createElement('button');
        burger.type = 'button';
        burger.className = 'dsh-mw-burger';
        burger.setAttribute('aria-label', '打开侧边栏');
        burger.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z" fill="currentColor"/></svg>';
        const onBurgerClick = () => {
          const frame = findFrame();
          if (frame) frame.querySelector("[class*='_sidebarCol'] [class*='_toggle']")?.click();
        };
        burger.addEventListener('click', onBurgerClick);
        document.body.appendChild(burger);

        // The frame element can be remounted by the app router; re-attach the
        // scrim whenever the subtree changes and the frame identity differs.
        const ensureScrim = () => {
          const frame = findFrame();
          if (!frame) {
            scrimFrame = null;
            scrim.remove();
            return;
          }
          if (frame !== scrimFrame) {
            scrimFrame = frame;
            frame.appendChild(scrim);
          }
        };
        ensureScrim();
        const observer = new MutationObserver(ensureScrim);
        observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });

        const onScrimClick = () => {
          if (scrimFrame) closeDrawers(scrimFrame);
        };
        scrim.addEventListener('click', onScrimClick);

        const onKeydown = (event) => {
          if (event.key !== 'Escape' || !mq.matches) return;
          const frame = findFrame();
          if (frame && (!frame.hasAttribute('data-sidebar-collapsed') || !frame.hasAttribute('data-details-collapsed'))) {
            closeDrawers(frame);
          }
        };
        document.addEventListener('keydown', onKeydown);

        // Picking a session (or starting a new one) from the drawer should
        // navigate AND reveal the conversation — the app's own handler runs
        // first, then the drawer closes behind it.
        const onDocClick = (event) => {
          if (!mq.matches) return;
          const frame = findFrame();
          if (!frame || frame.hasAttribute('data-sidebar-collapsed')) return;
          const hit = event.target?.closest?.("[class*='_sessionRow'], [class*='_newSession']");
          if (hit && frame.contains(hit)) {
            setTimeout(() => closeDrawers(frame), 0);
          }
        };
        document.addEventListener('click', onDocClick);

        // Swipe gestures (phone only): a clearly-horizontal swipe right opens
        // the sidebar drawer, swipe left closes it. Fires as soon as the
        // threshold is crossed, mid-gesture. Deliberately NOT an edge gesture
        // — Android's system back owns the screen edge. Vertical scrolling
        // and horizontal scrollers (R2 code blocks / tables) are left alone;
        // listeners stay passive and never preventDefault.
        const SWIPE_MIN_X = 64;
        let swipe = null;
        const onTouchStart = (event) => {
          if (!mq.matches || event.touches.length !== 1) { swipe = null; return; }
          const t = event.touches[0];
          swipe = { x0: t.clientX, y0: t.clientY, dead: false, fired: false };
        };
        const onTouchMove = (event) => {
          if (!swipe || swipe.dead || swipe.fired || event.touches.length !== 1) return;
          const t = event.touches[0];
          const dx = t.clientX - swipe.x0;
          const dy = t.clientY - swipe.y0;
          if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
          if (Math.abs(dy) > Math.abs(dx)) { swipe.dead = true; return; }
          if (event.target?.closest?.("[data-conversation-scroll] pre, [data-conversation-scroll] table")) { swipe.dead = true; return; }
          const frame = findFrame();
          if (!frame) { swipe.dead = true; return; }
          if (dx >= SWIPE_MIN_X && frame.hasAttribute('data-sidebar-collapsed')) {
            swipe.fired = true;
            frame.querySelector("[class*='_sidebarCol'] [class*='_toggle']")?.click();
          } else if (dx <= -SWIPE_MIN_X && !frame.hasAttribute('data-sidebar-collapsed')) {
            swipe.fired = true;
            closeDrawers(frame);
          }
        };
        const onTouchEnd = () => { swipe = null; };
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
          observer.disconnect();
          scrim.removeEventListener('click', onScrimClick);
          burger.removeEventListener('click', onBurgerClick);
          document.removeEventListener('keydown', onKeydown);
          document.removeEventListener('click', onDocClick);
          document.removeEventListener('touchstart', onTouchStart);
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', onTouchEnd);
          document.removeEventListener('touchcancel', onTouchEnd);
          scrim.remove();
          burger.remove();
          style.remove();
          if (meta && originalViewport !== null) meta.setAttribute('content', originalViewport);
        };
      }, 'mobile-webui: layout fixes');
    }

    exports.apply = apply;
    // Debug/verification handle: lets Playwright mount the plugin on a live
    // page before the package is installed (fake ctx: { effect: (fn) => fn() }).
    window.__dshMobileWebuiApply = apply;
    return module.exports;
  },
});
