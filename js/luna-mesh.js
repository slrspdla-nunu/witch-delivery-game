// 루나 바람 애니메이션 — PixiJS 메쉬 변형 (AE 퍼펫핀 방식)
// 원본 1장을 자르지 않고 격자 메쉬에 올려, 지정한 핀(pivot) 주변 정점만 흔든다.
(function () {
  "use strict";

  const TEX_URL = "image/luna_main_pose_transparent.png";
  const mount = document.getElementById("luna-mesh");
  const fallback = document.getElementById("luna-fallback");

  function showFallback(reason) {
    if (reason) console.warn("[luna-mesh] 폴백 사용:", reason);
    if (mount) mount.style.display = "none";
    if (fallback) fallback.hidden = false;
  }

  // WebGL / PIXI 사용 불가 → 정지 이미지로 폴백
  if (typeof PIXI === "undefined" || !mount) {
    showFallback("PIXI 미로드");
    return;
  }

  // ---- 유틸 ----
  function smoothstep(edge0, edge1, x) {
    let t = (x - edge0) / (edge1 - edge0);
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }
  const deg = (d) => (d * Math.PI) / 180;

  // ---- 핀 존 정의 (좌표는 텍스처 UV 0..1) ----
  // pivot: 고정되는 핀 지점 / bbox: 영향 범위 / amp: 최대 회전각(rad)
  // speed: 각속도(rad/s) / phase: 위상 / reach: 핀에서 자유단까지 UV 거리
  const ZONES = [
    { name: "star",   px: 0.235, py: 0.085, bx0: 0.18, bx1: 0.28, by0: 0.050, by1: 0.170,
      amp: deg(6),   speed: (2 * Math.PI) / 2.8, phase: 0.0,  reach: 0.085 },
    { name: "braidL", px: 0.280, py: 0.270, bx0: 0.09, bx1: 0.29, by0: 0.245, by1: 0.400,
      amp: deg(3.5), speed: (2 * Math.PI) / 3.2, phase: 1.1,  reach: 0.170 },
    { name: "braidR", px: 0.660, py: 0.270, bx0: 0.65, bx1: 0.91, by0: 0.235, by1: 0.375,
      amp: deg(3.5), speed: (2 * Math.PI) / 3.6, phase: 3.0,  reach: 0.210 },
    { name: "broom",  px: 0.300, py: 0.710, bx0: 0.00, bx1: 0.31, by0: 0.635, by1: 0.945,
      amp: deg(2.2), speed: (2 * Math.PI) / 4.4, phase: 2.0,  reach: 0.300 },
  ];
  const EDGE = 0.03; // bbox 가장자리 페이드 폭(UV)

  (async function init() {
    let app;
    try {
      app = new PIXI.Application({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
    } catch (e) {
      showFallback("Application 생성 실패: " + e.message);
      return;
    }

    // WebGL 컨텍스트 확인
    if (!app.renderer || app.renderer.type !== PIXI.RENDERER_TYPE.WEBGL) {
      showFallback("WebGL 미지원");
      return;
    }

    mount.appendChild(app.view);

    let tex;
    try {
      tex = await PIXI.Assets.load(TEX_URL);
    } catch (e) {
      showFallback("텍스처 로드 실패: " + e.message);
      return;
    }

    const W = tex.width, H = tex.height;
    app.renderer.resize(W, H); // 내부 해상도 = 텍스처 픽셀, CSS로 축소 표시
    // resize()가 autoDensity로 인라인 style을 px로 덮어쓰므로 이후에 다시 100% 지정
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    app.view.style.display = "block";

    const SEGX = 30, SEGY = 36;
    const geometry = new PIXI.PlaneGeometry(W, H, SEGX, SEGY);
    const mesh = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(tex));
    app.stage.addChild(mesh);

    const buf = geometry.getBuffer("aVertexPosition");
    const pos = buf.data;                    // [x0,y0, x1,y1, ...] (픽셀)
    const rest = Float32Array.from(pos);     // 원위치 보관

    // 정점별로 각 존의 가중치를 미리 계산 (매 프레임 재계산 불필요)
    // vertWeights[i] = [{zone, w}, ...]  (w>0 인 존만)
    const vertWeights = new Array(rest.length / 2);
    for (let i = 0; i < rest.length; i += 2) {
      const u = rest[i] / W, v = rest[i + 1] / H; // UV
      const list = [];
      for (const z of ZONES) {
        // bbox 마스크 (가장자리 부드럽게)
        const mx = smoothstep(z.bx0 - EDGE, z.bx0 + EDGE, u) *
                   (1 - smoothstep(z.bx1 - EDGE, z.bx1 + EDGE, u));
        const my = smoothstep(z.by0 - EDGE, z.by0 + EDGE, v) *
                   (1 - smoothstep(z.by1 - EDGE, z.by1 + EDGE, v));
        const bboxMask = mx * my;
        if (bboxMask <= 0.001) continue;
        // 핀에서의 거리 → 자유단으로 갈수록 1 (핀 근처는 0 = 고정)
        const d = Math.hypot(u - z.px, v - z.py);
        const radial = smoothstep(0, z.reach, d);
        const w = bboxMask * radial;
        if (w > 0.001) list.push({ z, w });
      }
      vertWeights[i / 2] = list;
    }

    let elapsed = 0;
    function applyDeform(t) {
      for (let i = 0; i < rest.length; i += 2) {
        let x = rest[i], y = rest[i + 1];
        const list = vertWeights[i / 2];
        for (let k = 0; k < list.length; k++) {
          const { z, w } = list[k];
          const ang = z.amp * Math.sin(t * z.speed + z.phase) * w;
          if (ang === 0) continue;
          const cx = z.px * W, cy = z.py * H;   // 핀(픽셀)
          const dx = x - cx, dy = y - cy;
          const c = Math.cos(ang), s = Math.sin(ang);
          x = cx + dx * c - dy * s;
          y = cy + dx * s + dy * c;
        }
        pos[i] = x;
        pos[i + 1] = y;
      }
      buf.update();
    }
    app.ticker.add(() => {
      elapsed += app.ticker.deltaMS / 1000;
      applyDeform(elapsed);
    });

    // 디버그 훅 (검증용) — 정점 이동량 확인에 사용
    window.__lunaMesh = {
      sumDelta() {
        let s = 0;
        for (let i = 0; i < rest.length; i++) s += Math.abs(pos[i] - rest[i]);
        return s;
      },
      maxDelta() {
        let m = 0;
        for (let i = 0; i < rest.length; i++) m = Math.max(m, Math.abs(pos[i] - rest[i]));
        return m;
      },
      info() {
        return {
          elapsed: +elapsed.toFixed(3),
          tickerStarted: app.ticker.started,
          weightedVerts: vertWeights.filter((l) => l && l.length).length,
          totalVerts: vertWeights.length,
          visibility: document.visibilityState,
        };
      },
      step(t) { applyDeform(t); return this.maxDelta(); }, // 수동 프레임 (검증용)
    };

    console.log("[luna-mesh] 초기화 완료 — 정점", rest.length / 2, "개, 존", ZONES.length);
  })();
})();
