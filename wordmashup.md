# Word Mashup — 서비스 전체 개요

> 5~7세 아동을 위한 영어 복합어 학습 웹 게임

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | **Word Mashup** |
| 장르 | 영어 학습 퍼즐 게임 |
| 대상 | 5~7세 한국 아동 |
| 플랫폼 | 웹 브라우저 (PC · 태블릿) |
| 접속 방법 | URL 직접 접속, 설치 불필요 |
| 언어 | 영어 콘텐츠 + 한국어 UI |

---

## 2. 핵심 학습 목표

영어 **복합어(Compound Word)** 를 두 단어 조각을 직접 합쳐보는 행위를 통해 자연스럽게 익힌다.

- **학습 방식**: 설명 없이 게임 안에서 직접 맞춰보며 체득
- **성공 기준**: 5세 아이가 혼자 앉아서 어른 도움 없이 6라운드를 완주

---

## 3. 게임 플로우

```
인트로 영상 재생
    ↓ SKIP 또는 영상 종료 후 START
로딩 화면 (BootScene)
    ↓
메인 게임 (GameScene) — 6라운드 반복
    ↓ 6라운드 완료
결과 화면 (Finale — Compound Book)
    ↓ Next Play
다시 GameScene 재시작
```

### 3-1. 인트로 영상

- 게임 시작 전 **intro.mp4** 전체 화면 재생
- 2초 후 **SKIP** 버튼 표시 (반투명 pill 스타일, 파동 애니메이션)
- 영상 종료 시 버튼이 **START** 로 전환 (더 크고 밝게)
- 클릭 시 페이드 아웃 후 게임 진입

### 3-2. 라운드 진행

한 세션당 **6라운드**, 30개 복합어 풀에서 무작위 선택.

```
라운드 시작 → 카드 등장 (float 애니메이션)
    ↓
왼쪽 카드 1장 선택 + 오른쪽 카드 1장 선택
    ↓
중앙 Gravity Zone에 드롭/탭으로 조합 시도
    ↓
정답 → 파티클 폭발 + 사운드 + 결과 카드 표시 → 다음 라운드
오답 → 카드 흔들림 + 오답 사운드 → 재시도
    ↓ 6라운드 완료
결과 화면
```

---

## 4. 게임 콘텐츠 (복합어 30종)

| # | Word 1 | Word 2 | Result | 발음 |
|---|--------|--------|--------|------|
| 1 | pan | cake | **pancake** | PAN·cake |
| 2 | sun | flower | **sunflower** | SUN·flow·er |
| 3 | star | fish | **starfish** | STAR·fish |
| 4 | rain | bow | **rainbow** | RAIN·bow |
| 5 | birth | day | **birthday** | BIRTH·day |
| 6 | butter | fly | **butterfly** | BUT·ter·fly |
| 7 | base | ball | **baseball** | BASE·ball |
| 8 | foot | ball | **football** | FOOT·ball |
| 9 | snow | ball | **snowball** | SNOW·ball |
| 10 | water | fall | **waterfall** | WA·ter·fall |
| 11 | moon | light | **moonlight** | MOON·light |
| 12 | fire | place | **fireplace** | FIRE·place |
| 13 | book | shelf | **bookshelf** | BOOK·shelf |
| 14 | cup | cake | **cupcake** | CUP·cake |
| 15 | sea | shell | **seashell** | SEA·shell |
| 16 | hand | bag | **handbag** | HAND·bag |
| 17 | door | bell | **doorbell** | DOOR·bell |
| 18 | eye | ball | **eyeball** | EYE·ball |
| 19 | key | board | **keyboard** | KEY·board |
| 20 | note | book | **notebook** | NOTE·book |
| 21 | play | ground | **playground** | PLAY·ground |
| 22 | snow | flake | **snowflake** | SNOW·flake |
| 23 | sun | rise | **sunrise** | SUN·rise |
| 24 | sun | set | **sunset** | SUN·set |
| 25 | tea | pot | **teapot** | TEA·pot |
| 26 | tooth | brush | **toothbrush** | TOOTH·brush |
| 27 | water | melon | **watermelon** | WA·ter·mel·on |
| 28 | week | end | **weekend** | WEEK·end |
| 29 | light | house | **lighthouse** | LIGHT·house |
| 30 | news | paper | **newspaper** | NEWS·pa·per |

---

## 5. 화면 구성

### 5-1. 게임 화면 (GameScene)

```
┌─────────────────────────────────────────────────────┐
│  [Compound Book ━━━━━━━] [★Score] [💰Coin] [💎Gem]  │  ← HUD
├─────────────────────────────────────────────────────┤
│                                                     │
│  [LEFT CARD] [LEFT CARD] [LEFT CARD]                │  ← 왼쪽 단어 카드 3장
│                                                     │
│                  ╔══════╗                           │
│                  ║  ✦   ║  ← Gravity Zone           │
│                  ╚══════╝    (조합 드롭 영역)         │
│                                                     │
│  [RIGHT CARD] [RIGHT CARD] [RIGHT CARD]             │  ← 오른쪽 단어 카드 3장
│                                                     │
├─────────────────────────────────────────────────────┤
│   [←Back]   [↺Replay]   [💡Hint]   [🎤Mic]         │  ← 하단 네비게이션
└─────────────────────────────────────────────────────┘
```

#### HUD 구성 요소

| 요소 | 역할 |
|------|------|
| Compound Book 진행 바 | 현재 라운드 진행률 (1/6 ~ 6/6) |
| ★ Score | 정답 맞출 때 획득 |
| 💰 Coin | 게임 내 재화 |
| 💎 Gem | 게임 내 재화 |
| ⚙️ 설정 | BGM / SFX 개별 토글 |

#### 하단 네비게이션 버튼

| 버튼 | 기능 |
|------|------|
| ← Back | 페이드 아웃 후 씬 재시작 |
| ↺ Replay | 현재 라운드 카드 재배치 |
| 💡 Hint | (예비) |
| 🎤 Mic | (예비) |

#### 카드 동작

- **Float 애니메이션**: 카드가 위아래로 부드럽게 떠다님
- **Drag & Drop**: 마우스/터치로 드래그 → Gravity Zone에 드롭
- **Tap 선택**: 좌우 카드를 순서대로 탭해도 조합 가능
- **선택 피드백**: 선택된 카드 scale 1.08× 확대 + glow
- **드래그 피드백**: 드래그 중 scale 1.06× + 테두리 강조
- **오답 피드백**: 카드 흔들기(shakeBack) → 원위치 복귀

#### Gravity Zone (중앙 조합 영역)

- 네온 glow 애니메이션 (색상 보간)
- 회전하는 스핀 아우라
- 카드 드롭 시 snapping (scale 1.15× 확대)

---

### 5-2. 결과 화면 — Compound Book

6라운드 완료 시 책 형태의 결과 팝업 등장.

```
┌────────────────────────────────────────────────────────┐
│  📖 Compound Book          [설정 패널 닫힘]             │
│  ─────────────────────────┬─────────────────────── ── │
│  (왼쪽 페이지)             │  (오른쪽 페이지)           │
│                           │                           │
│  이번 라운드               │  미획득 카드 도감           │
│  획득한 카드 6장           │  (회색 톤다운 + ?)         │
│  (컬러 팝인 애니메이션)     │  6장씩 페이지네이션        │
│                           │  ● ○ ○ ○ ○  ← 도트 인디케이터│
│                           │  ‹              ›         │
└───────────────────────────┴───────────────────────────┘
                   ▶ Next Play
```

#### 왼쪽 페이지 — 이번 회차 결과

- 이번 라운드에서 조합한 복합어 카드 **6장** (3열 × 2행)
- 신규 획득 카드: **Back.easeOut 팝인 + 파티클 버스트**
- 기존 보유 카드: 페이드 인

#### 오른쪽 페이지 — 미획득 카드 도감

- **미획득 카드만** 표시 (획득 카드는 제외)
- 실제 카드 이미지를 **회색 틴트(0x888888) + 투명도 40%** 로 표시
- 카드 위 **"?" 텍스트** (흰색, 그림자)
- **6장씩 페이지네이션** (최대 5페이지)
- 하단 **원형 도트 인디케이터** (활성: 진한 보라 / 비활성: 연한 반투명)
- `‹` / `›` 화살표 버튼으로 페이지 이동
- 전체 수집 시 "All Collected! 🎉" 메시지

#### 카운트 표시

- 오른쪽 상단 타이틀 위치: **`19 / 30`** 형태로 누적 획득 수

---

## 6. 도감 시스템 (Collection)

### 저장 방식

```
localStorage key: 'phonics_collected_v1'
value: JSON array of result strings
예시: ["pancake","sunflower","birthday","baseball",...]
```

### 동작 방식

- 라운드 정답 맞힐 때마다 결과 단어를 컬렉션에 추가
- **세션 초기화 후에도 유지** (localStorage 영속)
- 새 기기 / 시크릿 탭에서는 초기화됨
- 수동 초기화: 브라우저 콘솔에서 `localStorage.removeItem('phonics_collected_v1')`

---

## 7. 비주얼 & 애니메이션

### 파티클 시스템

| 텍스처 | 용도 |
|--------|------|
| pDot | 기본 원형 파티클 (폭발 효과) |
| ray | 흰색 캡슐 — 선버스트 방사 |
| rayGrad | 그라디언트 갓 레이 |
| starSpark | 4방향 별 반짝임 |
| cloudPuff | 흰 구름 퍼프 |

### 카드 시각 요소

| 타입 | 구성 |
|------|------|
| 이미지 카드 | PNG 배경 이미지 (card_left_*.png, card_right_*.png) |
| 결과 카드 | PNG 복합어 일러스트 (card_pancake.png 등 30종) |
| 폴백 카드 | 이모지 + 단어 텍스트 (이미지 로드 실패 시) |

### 컬러 팔레트 (카드 8가지 배색)

sky blue / rose pink / mint green / amber orange / lavender / butter yellow / ice blue / coral red

---

## 8. 오디오

| 항목 | 내용 |
|------|------|
| BGM | intro.mp4 오디오 트랙 루프 (게임 전반 동일 사운드) |
| SFX 정답 | Web Audio API 합성 — 상승 반짝임 4음 (A5·D6·G6·C7) |
| SFX 오답 | Web Audio API 합성 — 부드러운 하강 2음 (Eb4→Bb3) |
| 자동 재생 정책 | 첫 포인터 이벤트에서 AudioContext unlock |
| 토글 | BGM / SFX 각각 설정 패널에서 on/off |

---

## 9. 기술 스택

| 항목 | 버전 / 선택 |
|------|------------|
| 게임 프레임워크 | **Phaser 3.88.2** |
| 언어 | **TypeScript** |
| 빌드 도구 | **Vite 8.x** |
| 스케일 모드 | `Phaser.Scale.RESIZE` (전체 화면 대응) |
| 기준 해상도 | 1280 × 720 (p/q/sz 헬퍼로 비율 계산) |
| 저장소 | **localStorage** (서버 불필요) |
| 폰트 | Baloo 2, Inter (Google Fonts) |
| 배포 | **GitHub Pages** (GitHub Actions 자동 빌드) |

### 주요 파일 구조

```
src/
├── main.ts              — Phaser.Game 초기화 + 인트로 영상 오버레이
├── audio.ts             — BGM(HTMLAudio) + SFX(Web Audio API) 통합 관리
├── scenes/
│   ├── BootScene.ts     — 에셋 프리로드 + 로딩 바
│   └── GameScene.ts     — 핵심 게임 루프 (HUD, 카드, Zone, Finale)
├── objects/
│   └── WordCard.ts      — 드래그/탭 가능한 단어 카드 컴포넌트
└── data/
    └── compounds.ts     — 30개 복합어 데이터 + 카드 배색 스킴
```

### 스케일 헬퍼 (GameScene)

```typescript
const p  = (fx: number) => fx * GW / 1280;   // 가로 기준 픽셀
const q  = (fy: number) => fy * GH / 720;    // 세로 기준 픽셀
const sz = (f:  number) => f  * Math.min(GW / 1280, GH / 720);  // 균등 스케일
```

---

## 10. 배포

- **저장소**: GitHub (`jinilee-hue/phonics-wordmashup`)
- **CI/CD**: `main` 브랜치 push → GitHub Actions → `peaceiris/actions-gh-pages@v4`
- **빌드**: `npm run build` (tsc + vite build)
- **배포 경로**: `dist/` 폴더 → `gh-pages` 브랜치

---

## 11. 확장 예정 / 미구현 사항

| 항목 | 상태 |
|------|------|
| Hint 버튼 기능 | 미구현 (버튼 UI만 존재) |
| Mic 버튼 기능 | 미구현 (버튼 UI만 존재) |
| 음성 발음 재생 | 미구현 (pron 데이터는 준비됨) |
| 레벨/스테이지 구분 | 미구현 (단일 랜덤 라운드) |
| 코인/젬 활용 시스템 | 미구현 (카운터 UI만 존재) |
| 사용자 계정 / 클라우드 저장 | 미구현 |
| 멀티플레이어 | 미구현 |

---

*최종 업데이트: 2026-06-15*
