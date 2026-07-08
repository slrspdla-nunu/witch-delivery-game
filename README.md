# 마녀 배달부의 비상착륙

달빛 하늘 도시를 배경으로, 꼬마 마녀 루나가 빗자루를 타고 의뢰 물품을 배달하는 모바일 웹 게임 프로토타입입니다.

## 프로젝트 소개

이 프로젝트는 HTML, CSS, JavaScript 기반의 정적 웹 게임입니다. 별도 빌드 과정 없이 `index.html`을 브라우저에서 열어 바로 확인할 수 있으며, 모바일 세로 화면 중심의 메인 UI와 의뢰 선택 화면, 비행 게임 화면 구성을 포함합니다.

## 주요 기능

- 스플래시/메인 화면 진입 연출
- PixiJS 기반 루나와 네로 캐릭터 메쉬 애니메이션
- 배경 음악 재생 처리
- 의뢰 선택 UI
- HP, MP, 시간, 거리, 진행도 HUD
- 빗자루 비행 조작용 위/아래 버튼
- 별 마법, 방어막 등 게임 액션 버튼
- 모바일 화면 비율에 맞춘 판타지 게임 UI

## 실행 방법

저장소를 클론한 뒤 `index.html`을 브라우저에서 열면 됩니다.

```bash
git clone https://github.com/slrspdla-nunu/witch-delivery-game.git
cd witch-delivery-game
```

로컬 서버로 확인하고 싶다면 아래처럼 실행할 수 있습니다.

```bash
python -m http.server 8000
```

이후 브라우저에서 `http://localhost:8000`으로 접속합니다.

## 폴더 구조

```text
witch-delivery-game/
├── index.html
├── style.css
├── script.js
├── js/
│   ├── game.js
│   ├── bgm.js
│   ├── luna-mesh.js
│   ├── nero-mesh.js
│   ├── pixi.min.js
│   └── splash.js
├── image/
│   ├── background_clean_generated_ext.png
│   ├── luna_game_broom_pose_side.png
│   ├── game_button_*.png
│   ├── game_item_*.png
│   └── ui_*.png
├── audio/
│   └── main_Moonlit Sky Delivery.mp3
└── fonts/
    └── RIDIBatang.woff
```

## 사용 기술

- HTML5
- CSS3
- JavaScript
- PixiJS

## 개발 메모

- 모바일 환경을 우선으로 한 터치 인터페이스입니다.
- 주요 UI 이미지는 `image/` 폴더에 PNG 에셋으로 분리되어 있습니다.
- 게임 로직은 `js/game.js`, 일반 화면 전환과 버튼 피드백은 `script.js`에서 관리합니다.
- 배경음은 최초 사용자 입력 이후 재생되도록 구성되어 있습니다.

## 저장소

GitHub: https://github.com/slrspdla-nunu/witch-delivery-game
