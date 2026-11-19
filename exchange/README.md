# 교환·급매 전문관 (교환급매물.com)

부동산 교환·급매 매물 108건 포털의 **보관용 원본**입니다.
도메인 `교환급매물.com` 은 예스닉 301 포워딩으로 별도 호스팅(ship.place)을 가리키고 있어,
이 폴더는 (1) 소스 보관 (2) 영구 대체 주소 `https://autooneclick.com/exchange/` 두 가지 역할을 합니다.

- 상단에 `KTS 원클릭 — 더계약서 · 더뷰 · 더상세 · 전체 보기` 연동 밴드가 있습니다 (→ https://autooneclick.com/)
- 사진은 `img/p001.jpg ~ p108.jpg` 중 실제 쓰는 92장만 들어 있습니다.
- 2026-11-20 배포본: https://somber-father-bpye7.ship.place/ (ship.page 무료 배포는 6일 뒤 만료)

## 손대는 법
- 원본 작업 폴더: `output/교환포털_연동_20261120/` (index.html + 전체 img)
- 고친 뒤: `python3 output/kts_gate.py --dir <폴더>` 로 G1 통과 확인 → 이 폴더로 복사 → 커밋
