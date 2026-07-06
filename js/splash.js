// 인트로(스플래시) 오케스트레이션
// 로고·부제가 중앙에 뜨고 "터치해주세요" 안내가 나온 상태에서 대기.
// 첫 사용자 제스처(터치/클릭/키)에서 body.started 를 붙여
// 로고·부제를 메인 위치로 이동시키고 나머지 요소를 순차 등장시킨다.
// (같은 제스처로 bgm.js 가 배경음악을 재생 — 자동재생 정책 충족)
(function () {
  "use strict";

  const EVENTS = ["pointerdown", "touchstart", "keydown"];
  let started = false;

  function begin() {
    if (started) return;
    started = true;
    document.body.classList.add("started");
    EVENTS.forEach((e) => window.removeEventListener(e, begin));
  }

  function arm() {
    EVENTS.forEach((e) => window.addEventListener(e, begin, { passive: true }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arm);
  } else {
    arm();
  }
})();
