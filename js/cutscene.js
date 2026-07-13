// 챕터 컷신(비주얼 노벨) — 컷 이미지 + 대사 바 + 타자기 텍스트, 탭으로 진행.
// 마지막 줄에서 한 번 더 진행하거나 '건너뛰기' 시 배달 게임으로 이어진다.
(function () {
  "use strict";

  // 컷별 대사.
  //  cut: 컷 이미지 번호(1~8) / speaker: 이름판("" = 나레이션)
  //  portrait: image/<portrait>.png (null = 나레이션) / text: 대사
  const SCRIPT = {
    chapter1: [
      { cut: 1, speaker: "",   portrait: null,                       text: "달빛이 내려앉은 언덕 위…\n배달을 나선 꼬마 마녀 루나는, 그만 깜빡 잠이 들어 버렸다." },
      { cut: 2, speaker: "루나", portrait: "story_luna_flustered",     text: "으앙?! 나… 언제 잠든 거야?!" },
      { cut: 2, speaker: "루나", portrait: "story_luna_surprised",     text: "펴, 편지! 배달 편지 가방이 활짝 열려 있잖아—?!" },
      { cut: 3, speaker: "루나", portrait: "story_luna_surprised",     text: "안 돼애—! 편지들이 전부 밤하늘로 날아가 버렸어…!" },
      { cut: 3, speaker: "네로", portrait: "nero_surprised_transparent", text: "냐아앙—?!" },
      { cut: 4, speaker: "루나", portrait: "story_luna_surprised",     text: "앗, 저기! 별 봉인이 찍힌 편지가 도시 쪽으로 날아가고 있어…!" },
      { cut: 4, speaker: "네로", portrait: "nero_annoyed_transparent",  text: "냐! (멍하니 있지 말고 얼른 쫓아가!)" },
      { cut: 5, speaker: "루나", portrait: "story_luna_excited",       text: "기다려—! 저것만은 절대 놓칠 수 없어!" },
      { cut: 6, speaker: "루나", portrait: "story_luna_happy",         text: "하아… 하아… 겨우 잡았다. 어디 보자…" },
      { cut: 6, speaker: "루나", portrait: "story_luna_smile",         text: "'엘리 베이커리'… 오늘 밤 안에 닿아야 하는 케이크 편지구나!" },
      { cut: 7, speaker: "루나", portrait: "story_luna_confident",     text: "네로, 많이 늦었지만… 그래도 꼭 전해주자!" },
      { cut: 7, speaker: "네로", portrait: "nero_smile_transparent",    text: "냐앙! (당연하지, 가자!)" },
      { cut: 8, speaker: "루나", portrait: "story_luna_excited",       text: "빗자루도 반짝— 고쳤고… 좋았어!" },
      { cut: 8, speaker: "루나", portrait: "story_luna_confident",     text: "마녀 배달부 루나, 지금부터 배달 시작—!" },
    ],
  };

  const TYPE_MS = 30;                       // 글자당 타자 속도(ms)
  const AFTER_CUTSCENE_REQUEST = "케이크 배달"; // 컷신 후 시작할 배달 (추후 변경 예정)

  const els = {};
  let lines = [];
  let idx = 0;
  let typing = false;
  let typeTimer = null;
  let curCut = 0;
  let active = false;

  function cache() {
    els.screen = document.querySelector(".cutscene-screen");
    els.art = document.querySelector(".cutscene-art");
    els.dialogue = document.querySelector(".cutscene-dialogue");
    els.name = document.querySelector(".cutscene-name");
    els.text = document.querySelector(".cutscene-text");
    els.next = document.querySelector(".cutscene-next");
    els.portraitImg = document.querySelector(".cutscene-portrait-img");
    els.skip = document.querySelector("[data-cutscene-skip]");
  }

  function typewrite(str) {
    typing = true;
    els.text.textContent = "";
    els.next.classList.add("is-hidden");
    let i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      els.text.textContent = str.slice(0, ++i);
      if (i >= str.length) {
        clearInterval(typeTimer);
        typing = false;
        els.next.classList.remove("is-hidden");
      }
    }, TYPE_MS);
  }

  function completeTyping() {
    clearInterval(typeTimer);
    els.text.textContent = lines[idx].text;
    typing = false;
    els.next.classList.remove("is-hidden");
  }

  function showLine(n) {
    const line = lines[n];
    if (!line) return;
    // 컷 이미지 교체 (바뀔 때만, 페이드 + 살짝 줌)
    if (line.cut !== curCut) {
      curCut = line.cut;
      els.art.classList.add("is-fading");   // 이전 컷: 살짝 확대되며 페이드아웃
      window.setTimeout(() => {
        els.art.src = `image/story_mode_generated/cutscene_${line.cut}.png`;
        els.art.classList.remove("is-fading"); // 새 컷: scale 1.05→1.0 + 페이드인
      }, 190);
    }
    // 화자 / 이름판 / 초상화
    const narration = !line.speaker;
    els.dialogue.classList.toggle("is-narration", narration);
    els.name.textContent = line.speaker || "";
    if (line.portrait) els.portraitImg.setAttribute("src", `image/story_mode_generated/${line.portrait}.png`);
    typewrite(line.text);
  }

  function advance() {
    if (!active) return;
    if (typing) { completeTyping(); return; }      // 타자 중이면 즉시 완성
    if (idx >= lines.length - 1) { endCutscene(); return; }
    idx += 1;
    showLine(idx);
  }

  function endCutscene() {
    if (!active) return;
    active = false;
    clearInterval(typeTimer);
    document.body.classList.remove("cutscene-view");
    document.body.dataset.selectedRequest = AFTER_CUTSCENE_REQUEST;
    document.body.classList.add("play-view");
    window.WitchGame?.start(AFTER_CUTSCENE_REQUEST);
  }

  function start(chapterId) {
    cache();
    lines = SCRIPT[chapterId] || SCRIPT.chapter1;
    idx = 0;
    curCut = 0;
    active = true;
    // 첫 컷도 페이드인+줌으로 등장 (is-fading 상태로 세팅 후 다음 프레임에 해제)
    curCut = lines[0].cut;
    els.art.classList.add("is-fading");
    els.art.src = `image/story_mode_generated/cutscene_${lines[0].cut}.png`;
    // 가로 모드 요청 (게임과 동일 — 모바일 전체화면/방향 잠금)
    window.WitchGame?.requestLandscape?.();
    showLine(0);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => els.art.classList.remove("is-fading")));
  }

  function bind() {
    cache();
    if (!els.screen) return;
    els.screen.addEventListener("click", (e) => {
      if (e.target.closest("[data-cutscene-skip]")) return; // 건너뛰기는 별도 처리
      advance();
    });
    els.skip?.addEventListener("click", (e) => { e.stopPropagation(); endCutscene(); });
    window.addEventListener("keydown", (e) => {
      if (!active) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); advance(); }
      else if (e.key === "Escape") { endCutscene(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  window.WitchCutscene = { start };
})();
