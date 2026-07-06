// 네로 바람 애니메이션 — PixiJS 메쉬 변형 (AE 퍼펫핀 방식)
// 원본 1장을 자르지 않고 격자 메쉬에 올려, 지정한 핀(pivot) 주변 정점만 흔든다.
// 핀은 각 부위의 뿌리에 두고, 자유단(귀 끝·꼬리 끝)이 살랑거린다.
(function () {
  "use strict";

  const TEX_URL = "image/nero_cat_transparent.png";
  const mount = document.getElementById("nero-mesh");
  const fallback = document.getElementById("nero-fallback");

  function showFallback(reason) {
    if (reason) console.warn("[nero-mesh] 폴백 사용:", reason);
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
  // pivot: 고정되는 핀 지점(부위 뿌리) / bbox: 영향 범위 / amp: 최대 회전각(rad)
  // reach: 핀에서 자유단까지 UV 거리
  // wave "sway"  : 부드러운 사인파 살랑임 — speed(각속도), phase(위상 rad)
  // wave "twitch": 평소 정지, 랜덤 간격으로 1~2회 쫑긋 — restMin/restMax(쉬는 간격 s 범위)
  const ZONES = [
    { name: "earL", px: 0.200, py: 0.215, bx0: 0.02, bx1: 0.32, by0: 0.020, by1: 0.235,
      wave: "twitch", amp: deg(12), restMin: 0.9, restMax: 3.2, reach: 0.150 },
    { name: "earR", px: 0.455, py: 0.205, bx0: 0.37, bx1: 0.64, by0: 0.020, by1: 0.225,
      wave: "twitch", amp: deg(12), restMin: 1.1, restMax: 3.8, reach: 0.150 },
    { name: "tail", px: 0.710, py: 0.900, bx0: 0.68, bx1: 1.00, by0: 0.520, by1: 0.980,
      wave: "sway",   amp: deg(6),  speed: (2 * Math.PI) / 3.8, phase: 2.2, reach: 0.360 },
  ];

  // 쫑긋 한 번(반사인 bump) 지속 시간과 연속 쫑긋 사이 간격 (초)
  const FLICK = 0.16, GAP = 0.06;

  // twitch 존 런타임 상태 초기화 — 첫 쫑긋까지 살짝 다른 대기시간
  for (const z of ZONES) {
    if (z.wave === "twitch") { z._next = 0.5 + Math.random() * 1.8; z._ev = null; }
  }

  // 존별 기준 회전각(가중치 w 곱하기 전).
  // twitch: 진짜 고양이처럼 랜덤하게 1회 or 2회(쫑긋쫑긋) 쫑긋 / sway: 느린 살랑임.
  function zoneAngle(z, t) {
    if (z.wave === "twitch") {
      let ev = z._ev;
      if (!ev && t >= z._next) {
        // 이벤트 시작: 절반 확률로 쫑긋쫑긋(2회), 세기도 매번 살짝 다르게
        const flicks = Math.random() < 0.5 ? 2 : 1;
        const dur = flicks === 2 ? FLICK * 2 + GAP : FLICK;
        ev = z._ev = { start: t, dur, flicks, amp: z.amp * (0.85 + Math.random() * 0.3) };
      }
      if (!ev) return 0;
      const local = t - ev.start;
      if (local < 0) return 0;
      if (local >= ev.dur) {                    // 이벤트 종료 → 다음 쫑긋 예약
        z._ev = null;
        z._next = t + z.restMin + Math.random() * (z.restMax - z.restMin);
        return 0;
      }
      let a = 0;
      if (local < FLICK) {                       // 첫 번째 쫑긋
        a = Math.sin((local / FLICK) * Math.PI);
      } else if (ev.flicks === 2 && local >= FLICK + GAP) {
        a = Math.sin(((local - FLICK - GAP) / FLICK) * Math.PI) * 0.9; // 둘째는 살짝 작게
      }
      return ev.amp * a;
    }
    return z.amp * Math.sin(t * z.speed + z.phase);
  }
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

    const SEGX = 26, SEGY = 40;
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
      // 존별 기준 각도는 프레임당 1회만 계산 (twitch가 상태를 갖기 때문)
      for (const z of ZONES) z._ang = zoneAngle(z, t);
      for (let i = 0; i < rest.length; i += 2) {
        let x = rest[i], y = rest[i + 1];
        const list = vertWeights[i / 2];
        for (let k = 0; k < list.length; k++) {
          const { z, w } = list[k];
          const ang = z._ang * w;
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
    window.__neroMesh = {
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
      angles() { // 현재 프레임 존별 기준각(도) — 쫑긋 검증용
        const o = {};
        for (const z of ZONES) o[z.name] = +((z._ang || 0) * 180 / Math.PI).toFixed(2);
        return o;
      },
    };

    console.log("[nero-mesh] 초기화 완료 — 정점", rest.length / 2, "개, 존", ZONES.length);
  })();
})();
