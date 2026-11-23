# shared/ — 케이티에스 원클릭 공통 틀 (디자인 시스템 1벌)

딥네이비·오렌지(#ff6b00 고정) 토큰 2벌(다크 기본 / 라이트) · 헤더 · 카드 · 44px 버튼 · 표 · 푸터 · A4 인쇄 규칙.

## 적용법 (이 순서 그대로 — **페이지 CSS가 항상 뒤**, 기존 도구 색을 덮지 않게)

```html
<html lang="ko" data-kts-theme="dark">          <!-- JS 없이도 다크로 뜸(흰 화면 깜빡임 방지) -->
<link rel="stylesheet" href="shared/kts-tokens.css">
<link rel="stylesheet" href="shared/kts-ui.css">
<!-- 페이지 CSS(인라인 <style> 등) -->
<link rel="stylesheet" href="shared/kts-print.css">
<script src="shared/kts-ui.js" defer></script>
```

1. 토큰 `kts-tokens.css` → 컴포넌트 `kts-ui.css` → 페이지 CSS → 인쇄 `kts-print.css`.
2. 테마 토글은 `<button class="k-theme" type="button"></button>` 하나만 두면 `kts-ui.js` 가 ☾/☀·`aria-pressed`·`aria-label` 을 채운다. 값은 `localStorage['kts_theme']`(서버 전송 없음).
3. 기존 페이지 변수는 지우지 말고 별칭으로 연결: `:root{--bg:var(--k-bg);--panel:var(--k-panel);…}`.

## 파일

| 파일 | 내용 |
|---|---|
| `kts-tokens.css` | `--k-*` 색·글자·간격·radius·그림자. `:root`=다크, `html[data-kts-theme="light"]`=라이트 |
| `kts-ui.css` | `.k-hd` `.k-theme` `.k-nb` `.k-card` `.k-badge` `.k-btn` `.k-btn.ghost` `.k-tog` `.k-tbl` `.k-foot` |
| `kts-print.css` | `@media print` — 흰 배경·검은 글씨 강제, `header/footer/.k-noprint/.k-theme` 숨김, `.k-card{break-inside:avoid}` |
| `kts-ui.js` | `window.KTSUI = {theme(), setTheme(t), toggle()}` · `beforeprint`/`afterprint` → `html.kts-printing` |
| `kts-edge.js` (11-24) | `window.KTSEdge = {open(list,opts), close(), get(), set(arr), reset(), apply(list), sheet(title,html)}` — 내 메뉴 편집(엣지 패널 320px · ⠿끌기·▲▼·[빼기]·[+ 추가하기]·되돌리기) · `localStorage['kts_my_menu_v1']` · `[?]` 바텀시트 |

글꼴은 시스템 폰트(`--k-font`) — 웹폰트(2MB)를 내려받지 않는다. 390px 화면에서 10.5px 미만 글자 금지.

### 색깔 1 · 색깔 2 (11-24 · 179)

`<span class="k-theme2" role="group"><button type="button" data-kts-theme-set="dark">색깔1</button><button type="button" data-kts-theme-set="light">색깔2</button></span>` — `kts-ui.js` 가 고른 쪽에 `aria-pressed="true"` 를 채운다. 저장 키는 그대로 `kts_theme`(dark|light). 인쇄 때 숨김. 예전 `.k-theme` 단일 토글도 계속 동작한다.
