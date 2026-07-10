// 루나 흔들림 메쉬 (PixiJS) — 위아래 살랑거림.
// 대기·이동(비행 중 .play-luna) + 성공·실패 결과 화면(.success-luna/.failure-luna) 지원.
// 한 개의 PIXI 앱이 "지금 보이는 루나" 위로 옮겨 다니며, 그 텍스처/핀으로 메쉬를 재구성한다.
// 활성일 때만 원본 이미지를 숨기고(투명도 0, 충돌 판정은 유지) 메쉬를 겹쳐 보여준다.
(function () {
  "use strict";
  if (typeof PIXI === "undefined") return;

  const TAU = Math.PI * 2;

  // ---- 포즈 정의 (핀 좌표는 각 텍스처의 UV 0..1) ----
  // pin(px,py): 고정점 / bbox: 영향 범위 / reach: 핀→자유단 UV 거리
  // ampFrac: 위아래 진폭(텍스처 높이 대비) / speed·phase: 흔들림 리듬
  const POSES = [
    // 대기 (비행 중, 방향 0)
    {
      key: "idle", sel: ".play-luna", tex: "image/luna_game_broom_pose_side.png",
      match: (img) => playView() && !resultView() && srcHas(img, "luna_game_broom_pose_side") && !skillState(img),
      zones: [
        { px: 0.47, py: 0.15, bx0: 0.34, bx1: 0.51, by0: 0.07, by1: 0.21, reach: 0.10, ampFrac: 0.026, speed: TAU / 2.8, phase: 0.0 }, // 모자 끝
        { px: 0.46, py: 0.29, bx0: 0.28, bx1: 0.50, by0: 0.23, by1: 0.33, reach: 0.17, ampFrac: 0.034, speed: TAU / 3.2, phase: 1.1 }, // 양갈래 위
        { px: 0.46, py: 0.40, bx0: 0.30, bx1: 0.50, by0: 0.34, by1: 0.46, reach: 0.15, ampFrac: 0.034, speed: TAU / 3.6, phase: 2.3 }, // 양갈래 아래
        { px: 0.27, py: 0.56, bx0: 0.15, bx1: 0.35, by0: 0.35, by1: 0.58, reach: 0.17, ampFrac: 0.018, speed: TAU / 4.0, phase: 0.6 }, // 고양이
        { px: 0.33, py: 0.66, bx0: 0.00, bx1: 0.36, by0: 0.57, by1: 0.85, reach: 0.28, ampFrac: 0.038, speed: TAU / 4.4, phase: 2.0 }, // 빗자루
      ],
    },
    // 이동 (비행 중, 방향 ±1)
    {
      key: "move", sel: ".play-luna", tex: "image/luna_game_broom_pose_climb_dive_cat.png",
      match: (img) => playView() && !resultView() && srcHas(img, "climb_dive") && !skillState(img),
      zones: [
        { px: 0.53, py: 0.32, bx0: 0.30, bx1: 0.56, by0: 0.21, by1: 0.35, reach: 0.18, ampFrac: 0.034, speed: TAU / 3.0, phase: 0.4 }, // 양갈래 위
        { px: 0.56, py: 0.38, bx0: 0.34, bx1: 0.58, by0: 0.33, by1: 0.45, reach: 0.16, ampFrac: 0.034, speed: TAU / 3.5, phase: 1.6 }, // 양갈래 아래
        { px: 0.26, py: 0.57, bx0: 0.15, bx1: 0.35, by0: 0.38, by1: 0.59, reach: 0.17, ampFrac: 0.018, speed: TAU / 4.0, phase: 0.9 }, // 고양이
        { px: 0.32, py: 0.64, bx0: 0.00, bx1: 0.36, by0: 0.57, by1: 0.84, reach: 0.26, ampFrac: 0.038, speed: TAU / 4.4, phase: 2.4 }, // 빗자루
      ],
    },
    // 성공 결과 화면
    {
      key: "success", sel: ".success-luna", tex: "image/luna_delivery_success_transparent.png",
      match: () => document.body.classList.contains("result-success"),
      zones: [
        { px: 0.445, py: 0.366, bx0: 0.09, bx1: 0.47, by0: 0.31, by1: 0.42, reach: 0.22, ampFrac: 0.015, speed: TAU / 3.2, phase: 0.3 }, // 양갈래 좌
        { px: 0.60, py: 0.36, bx0: 0.58, bx1: 0.74, by0: 0.33, by1: 0.45, reach: 0.14, ampFrac: 0.015, speed: TAU / 3.6, phase: 1.9 }, // 양갈래 우
        { px: 0.28, py: 0.66, bx0: 0.00, bx1: 0.30, by0: 0.58, by1: 0.82, reach: 0.22, ampFrac: 0.017, speed: TAU / 4.2, phase: 2.2 }, // 빗자루
      ],
    },
    // 실패 결과 화면
    {
      key: "failure", sel: ".failure-luna", tex: "image/luna_delivery_failure_braids_fixed_transparent.png",
      match: () => document.body.classList.contains("result-failure"),
      zones: [
        { px: 0.37, py: 0.10, bx0: 0.24, bx1: 0.42, by0: 0.03, by1: 0.20, reach: 0.11, ampFrac: 0.011, speed: TAU / 3.2, phase: 0.0 }, // 모자 끝
        { px: 0.42, py: 0.32, bx0: 0.31, bx1: 0.46, by0: 0.28, by1: 0.40, reach: 0.13, ampFrac: 0.012, speed: TAU / 3.6, phase: 1.0 }, // 양갈래 좌
        { px: 0.63, py: 0.34, bx0: 0.58, bx1: 0.70, by0: 0.30, by1: 0.43, reach: 0.12, ampFrac: 0.012, speed: TAU / 4.0, phase: 2.1 }, // 양갈래 우
        { px: 0.26, py: 0.68, bx0: 0.00, bx1: 0.28, by0: 0.62, by1: 0.84, reach: 0.22, ampFrac: 0.015, speed: TAU / 4.4, phase: 2.6 }, // 빗자루
      ],
    },
  ];
  const EDGE = 0.03;

  function playView() { return document.body.classList.contains("play-view"); }
  function resultView() {
    return document.body.classList.contains("result-success") || document.body.classList.contains("result-failure");
  }
  function srcHas(img, s) { return (img.getAttribute("src") || "").indexOf(s) !== -1; }
  function skillState(img) {
    return img.classList.contains("is-hit") || img.classList.contains("is-dashing") ||
           img.classList.contains("is-shielded") || img.classList.contains("is-shield-break");
  }
  function smoothstep(e0, e1, x) { let t = (x - e0) / (e1 - e0); t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  (async function init() {
    let app;
    try {
      app = new PIXI.Application({ backgroundAlpha: 0, antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    } catch (e) { return; }
    if (!app.renderer || app.renderer.type !== PIXI.RENDERER_TYPE.WEBGL) return;

    const mount = document.createElement("div");
    mount.className = "luna-mesh-overlay";
    mount.setAttribute("aria-hidden", "true");
    mount.appendChild(app.view);
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    app.view.style.display = "block";

    const texCache = new Map();
    let mesh = null, buf = null, pos = null, rest = null, vertWeights = null;
    let curPose = null, curImg = null, meshReady = false, elapsed = 0, token = 0;

    function buildMesh(tex, zones) {
      if (mesh) { app.stage.removeChild(mesh); mesh.destroy(); mesh = null; }
      const W = tex.width, H = tex.height;
      app.renderer.resize(W, H);
      app.view.style.width = "100%";   // resize()가 autoDensity로 px 덮어쓰므로 재지정
      app.view.style.height = "100%";
      const geometry = new PIXI.PlaneGeometry(W, H, 30, 36);
      mesh = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(tex));
      app.stage.addChild(mesh);
      buf = geometry.getBuffer("aVertexPosition");
      pos = buf.data;
      rest = Float32Array.from(pos);
      vertWeights = new Array(rest.length / 2);
      for (let i = 0; i < rest.length; i += 2) {
        const u = rest[i] / W, v = rest[i + 1] / H;
        const list = [];
        for (const z of zones) {
          const mx = smoothstep(z.bx0 - EDGE, z.bx0 + EDGE, u) * (1 - smoothstep(z.bx1 - EDGE, z.bx1 + EDGE, u));
          const my = smoothstep(z.by0 - EDGE, z.by0 + EDGE, v) * (1 - smoothstep(z.by1 - EDGE, z.by1 + EDGE, v));
          const bboxMask = mx * my;
          if (bboxMask <= 0.001) continue;
          const d = Math.hypot(u - z.px, v - z.py);
          const w = bboxMask * smoothstep(0, z.reach, d);
          if (w > 0.001) list.push({ z, w, amp: z.ampFrac * H });
        }
        vertWeights[i / 2] = list;
      }
    }

    function applyDeform(t) {
      for (let i = 0; i < rest.length; i += 2) {
        const list = vertWeights[i / 2];
        let dy = 0;
        for (let k = 0; k < list.length; k++) {
          const it = list[k];
          dy += it.amp * Math.sin(t * it.z.speed + it.z.phase) * it.w;
        }
        pos[i] = rest[i];
        pos[i + 1] = rest[i + 1] + dy;
      }
      buf.update();
    }

    function syncToImage(img) {
      mount.style.left = img.offsetLeft + "px";
      mount.style.top = img.offsetTop + "px";
      mount.style.width = img.offsetWidth + "px";
      mount.style.height = img.offsetHeight + "px";
      const cs = getComputedStyle(img);
      mount.style.transform = cs.transform === "none" ? "" : cs.transform;
      mount.style.transformOrigin = cs.transformOrigin;
      mount.style.zIndex = cs.zIndex === "auto" ? "" : cs.zIndex;
      mount.style.filter = cs.filter === "none" ? "" : cs.filter;
    }

    async function activate(pose, img) {
      const my = ++token;
      if (curImg && curImg !== img) curImg.style.visibility = "";
      curPose = pose; curImg = img; meshReady = false;
      let tex = texCache.get(pose.tex);
      if (!tex) {
        try { tex = await PIXI.Assets.load(pose.tex); } catch (e) { return; }
        texCache.set(pose.tex, tex);
      }
      if (my !== token) return; // 그새 다른 포즈로 바뀜
      buildMesh(tex, pose.zones);
      if (mount.parentNode !== img.parentNode || mount.previousSibling !== img) {
        img.parentNode.insertBefore(mount, img.nextSibling);
      }
      mount.style.display = "block";
      img.style.visibility = "hidden"; // 원본 숨김 (충돌 판정용 박스는 유지)
      meshReady = true;
    }

    function deactivate() {
      token++;
      if (curImg) curImg.style.visibility = "";
      curImg = null; curPose = null; meshReady = false;
      mount.style.display = "none";
    }

    app.ticker.add(() => {
      elapsed += app.ticker.deltaMS / 1000;
      // 지금 활성인 포즈 찾기
      let pose = null, img = null;
      for (const p of POSES) {
        const el = document.querySelector(p.sel);
        if (el && p.match(el)) { pose = p; img = el; break; }
      }
      if (pose !== curPose || img !== curImg) {
        if (pose) activate(pose, img);
        else deactivate();
      }
      if (meshReady && curImg && mesh) {
        syncToImage(curImg);
        applyDeform(elapsed);
      }
    });

    console.log("[game-luna-mesh] 준비 완료 — 포즈", POSES.length, "종");
  })();
})();
