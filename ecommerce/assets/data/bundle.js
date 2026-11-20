/* 자동 생성 파일 — 직접 고치지 마세요. 값은 assets/data/*.json 에서 관리합니다. */
window.KTS_DATA = {
"fees": {
  "_note": "플랫폼 수수료·배송 요율 기본값입니다. verified=false 인 값은 판매자센터에서 확인해 실제 값으로 바꿔 주세요.",
  "checked": "2026-11-20",
  "coupang": {
    "source": "https://developers.coupangcorp.com (Open API 상품 등록·HMAC 서명) · 쿠팡 Wing 판매수수료 안내(판매자센터 로그인 필요)",
    "checked": "2026-11-20",
    "defaultRate": 0.108,
    "returnReserve": 0.03,
    "vatDivisor": 11,
    "categories": [
      {"name": "생활용품", "rate": 0.108, "code": "", "verified": false},
      {"name": "주방용품", "rate": 0.108, "code": "", "verified": false},
      {"name": "가전디지털", "rate": 0.078, "code": "", "verified": false},
      {"name": "패션잡화", "rate": 0.105, "code": "", "verified": false},
      {"name": "뷰티", "rate": 0.096, "code": "", "verified": false},
      {"name": "식품", "rate": 0.106, "code": "", "verified": false},
      {"name": "완구·취미", "rate": 0.108, "code": "", "verified": false},
      {"name": "스포츠·레저", "rate": 0.108, "code": "", "verified": false},
      {"name": "반려동물", "rate": 0.108, "code": "", "verified": false},
      {"name": "자동차용품", "rate": 0.10, "code": "", "verified": false}
    ],
    "api": {
      "host": "https://api-gateway.coupang.com",
      "createPath": "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products",
      "method": "POST",
      "signature": "message = signedDate + method + path + query (query는 '?' 없이) · HMAC-SHA256(secretKey) · hex 소문자",
      "dateFormat": "yyMMdd'T'HHmmss'Z' (GMT)",
      "header": "CEA algorithm=HmacSHA256, access-key={accessKey}, signed-date={signedDate}, signature={signature}"
    }
  },
  "naver": {
    "source": "https://sell.smartstore.naver.com (스마트스토어센터 판매수수료·상품명 가이드, 로그인 필요)",
    "checked": "2026-11-20",
    "defaultRate": 0.0563,
    "nameMax": 100,
    "nameRecommend": 50,
    "tagMax": 10,
    "tagLen": 20,
    "verified": false,
    "note": "네이버페이 주문관리수수료 + 매출연동수수료 합계 근사치(확인 필요)"
  },
  "global": {
    "source": "아마존 셀러센트럴 Referral Fee · 라쿠텐/큐텐 출점 안내 · 쇼피 판매자센터 수수료 안내 (각 센터 로그인 필요, 값 미확인)",
    "checked": "2026-11-20",
    "payRate": 0.03,
    "returnReserve": 0.03,
    "platforms": {
      "us": {"label": "미국(아마존)", "rate": 0.15, "verified": false, "note": "아마존 대부분 카테고리 Referral 15% (카테고리별 상이)"},
      "jp": {"label": "일본(라쿠텐·큐텐)", "rate": 0.10, "verified": false, "note": "근사치 — 출점 플랜·카테고리별 상이"},
      "sea": {"label": "동남아·대만(쇼피)", "rate": 0.10, "verified": false, "note": "근사치 — 커미션+거래수수료 합계, 국가별 상이"}
    },
    "shipBands": {
      "source": "우체국 국제소포·K-Packet 요금 참고 근사치(값 미확인 — 실제 요금 직접 입력 권장)",
      "checked": "2026-11-20",
      "verified": false,
      "bands": [
        {"maxG": 300,  "us": 9000,  "jp": 5500,  "sea": 6500},
        {"maxG": 500,  "us": 12000, "jp": 7000,  "sea": 8500},
        {"maxG": 1000, "us": 18000, "jp": 9500,  "sea": 12000},
        {"maxG": 2000, "us": 30000, "jp": 14000, "sea": 19000},
        {"maxG": 5000, "us": 60000, "jp": 26000, "sea": 36000}
      ],
      "methods": {"소포": 1.0, "특송": 1.6, "풀필먼트": 0.7}
    }
  }
},
"duties": {
  "_note": "역직구 관세·부가세·면세 기준입니다. 숫자마다 source(근거)·checked(확인일) 필드가 있고, 제도는 바뀌므로 실제 발송 전에 다시 확인하세요.",
  "checked": "2026-11-20",
  "us": {
    "label": "미국(아마존)",
    "currency": "USD",
    "fx": {"value": 1450, "source": "기본값(수정 가능) — 발송일 환율로 바꾸세요", "checked": "2026-11-20", "verified": false},
    "deMinimis": {"value": 0, "suspended": true, "text": "$800 소액면세(디미니미스) 무기한 중지. 2025-08-29 발효, 2026-06-24 연방규정으로 규정화. $2,500 이하 모든 화물에 관세 적용, 우편물도 예외 아님(정식·약식 통관). → 미국은 면세 구간이 없다고 계산합니다.", "source": "CBP 보도자료 2026-06-24 · Federal Register 2026-12670", "url": "https://www.cbp.gov/newsroom", "checked": "2026-11-20"},
    "why": ["예전 계산기는 '$800 이하 면세'로 계산했지만, 2025-08-29부터 이 면세가 중지되었습니다.", "그래서 이 계산기는 미국행 모든 가격에 관세·세금을 넣어 계산합니다(면세 적용 0건)."],
    "dutyRate": {"value": 0.15, "source": "기본 가정값(한국산 상호관세 15% 가정) — 품목 HTS 코드별 실제 세율로 바꾸세요", "checked": "2026-11-20", "verified": false},
    "vatRate": {"value": 0, "source": "미국은 연방 부가세 없음(주 판매세는 마켓플레이스가 손님에게 별도 징수) — 0으로 계산", "checked": "2026-11-20", "verified": false},
    "taxableRule": "과세가격 = 원화매출 (면세 없음)"
  },
  "jp": {
    "label": "일본(라쿠텐·큐텐)",
    "currency": "JPY",
    "fx": {"value": 9.4, "source": "기본값(1엔 = 9.4원, 수정 가능)", "checked": "2026-11-20", "verified": false},
    "deMinimis": {"value": 10000, "factor": 0.6, "itemLimit": 16666, "text": "과세가격 1만 엔 이하 관세·소비세 면세 유지. 단 개인사용 과세가격 = 해외소매가 ×0.6 특례 → 상품가 약 16,666엔까지 면세(운임 별도 표기 시). 이 특례는 2028-04-01 폐지. 2028-04-01부터 1만 엔 이하 통신판매에도 소비세 10%(판매자·지정 플랫폼 납부). 가죽제품·니트의류 등 면세 제외 품목 있음.", "source": "관세청 카스타무스 앤서 · 재무성 2026 세제개정 · 한국관세무역개발원 2026-10-06", "url": "https://www.customs.go.jp/tsukan/kojinyunyu.htm", "checked": "2026-11-20", "abolish": "2028-04-01"},
    "dutyRate": {"value": 0.05, "source": "기본 가정값(간이세율 근사) — 품목별 실제 세율로 바꾸세요", "checked": "2026-11-20", "verified": false},
    "vatRate": {"value": 0.10, "source": "일본 소비세 10%", "checked": "2026-11-20", "verified": true},
    "taxableRule": "과세가격 = (원화매출 − 국제배송) × 0.6 · 상품가(엔) × 0.6 ≤ 10,000엔이면 관세·소비세 0"
  },
  "sea": {
    "label": "동남아·대만(쇼피)",
    "source": "쇼피 판매자센터 안내(값 미확인 표시)",
    "url": "https://seller.shopee.com",
    "checked": "2026-11-20",
    "defaultCountry": "TW",
    "text": "국가별 상이(대만 저가면세·싱가포르 GST 9% 등). 기본값은 '면세 없음'으로 두고, 국가를 고르면 값이 바뀝니다. 현지 규정을 꼭 확인하세요.",
    "countries": {
      "TW": {"label": "대만", "currency": "TWD", "fx": 45, "dutyRate": 0.05, "vatRate": 0.05, "exemptLimit": 0, "verified": false, "note": "면세 없음 기본(저가면세 기준 변동 — 현지 규정 확인)"},
      "SG": {"label": "싱가포르", "currency": "SGD", "fx": 1100, "dutyRate": 0, "vatRate": 0.09, "exemptLimit": 0, "verified": false, "note": "GST 9% (저가 수입품에도 부과)"},
      "MY": {"label": "말레이시아", "currency": "MYR", "fx": 330, "dutyRate": 0.05, "vatRate": 0.10, "exemptLimit": 0, "verified": false, "note": "저가품 판매세 10% 근사(현지 규정 확인)"},
      "PH": {"label": "필리핀", "currency": "PHP", "fx": 25, "dutyRate": 0.05, "vatRate": 0.12, "exemptLimit": 0, "verified": false, "note": "VAT 12% 근사(현지 규정 확인)"}
    },
    "taxableRule": "과세가격 = 원화매출 · 국가별 면세 없음 기본 + 입력값으로 조정"
  },
  "notice": "제도는 바뀝니다 — 실제 발송 전 관세청·현지 세관·플랫폼 공지를 꼭 확인하세요.",
  "invoiceTip": "운임은 인보이스에 상품가와 따로 적어야 일본 면세 판정(상품가 ×0.6)에서 빠집니다."
},
"tags_ko": {
  "_note": "카테고리·속성·상황 키워드 사전. products 는 상품명에 들어 있는 핵심어로 찾고, 없으면 categories 기본값 + 상품명 낱말로 보충합니다.",
  "banned": ["최고", "1위", "완벽", "100%", "무조건", "정품보장", "최저가", "보장", "최상", "넘버원", "No.1", "특가", "대박"],
  "products": {
    "방수테이프": {
      "std": ["방수테이프", "누수테이프", "보수테이프", "실링테이프", "부틸테이프", "틈새테이프"],
      "attr": ["강력접착", "부틸고무", "알루미늄면", "자가융착", "내후성", "광폭"],
      "target": ["자취생", "집수리", "셀프인테리어", "공사현장", "캠핑족", "주부"],
      "situation": ["장마철", "누수보수", "옥상방수", "창틀틈새", "베란다", "배관보수"],
      "syn": ["방수테잎", "누수테잎", "방수태이프"],
      "spec": ["10cm폭", "5m롤", "1롤"],
      "en": "Waterproof Repair Tape", "ja": "防水補修テープ",
      "problem": ["비만 오면 창틀 틈으로 물이 스며 듭니다", "업체를 부르자니 작은 누수에 출장비가 더 나옵니다", "일반 테이프는 며칠 만에 들뜨고 떨어집니다"],
      "points": [["눌러 붙이면 끝", "뒷면 필름만 떼고 손으로 꾹 눌러 붙입니다", "공구 없이 누구나 바로 작업할 수 있습니다"], ["물에 강한 부틸 접착면", "젖은 곳 주변에도 단단히 밀착되도록 만든 접착면입니다", "틈새를 메워 물길을 막아 줍니다"], ["원하는 길이로 재단", "가위로 쉽게 잘라 쓰는 롤 형태입니다", "창틀·배관·옥상 모서리까지 모양대로 붙입니다"]],
      "specRows": [["재질", "부틸고무 + 알루미늄 표면"], ["폭", "10cm"], ["길이", "5m"], ["두께", "약 1mm"], ["사용 온도", "-20℃ ~ 80℃"], ["보관", "직사광선을 피해 서늘한 곳"]],
      "caution": ["먼지·기름기를 닦고 마른 상태에서 붙여 주세요", "물이 고여 있는 상태에서는 접착력이 떨어집니다", "구조적 균열·대형 누수는 전문 시공을 권합니다"]
    },
    "손난로": {
      "std": ["손난로", "핫팩", "충전식손난로", "보조배터리손난로", "전기손난로", "휴대용난로"],
      "attr": ["USB충전", "양면발열", "3단온도", "미니사이즈", "급속발열", "알루미늄바디"],
      "target": ["학생", "직장인", "수험생", "등산객", "낚시꾼", "출퇴근"],
      "situation": ["겨울출근", "야외활동", "캠핑", "등하교", "겨울낚시", "크리스마스선물"],
      "syn": ["손난노", "충전핫팩", "손난로충전식"],
      "spec": ["5000mAh", "C타입", "1개입"],
      "en": "Rechargeable Hand Warmer", "ja": "充電式ハンドウォーマー",
      "problem": ["출근길 버스를 기다리는 동안 손끝이 얼어붙습니다", "일회용 핫팩은 매일 사고 버리기가 아깝습니다", "주머니 속 핫팩은 금방 식어 버립니다"],
      "points": [["충전해서 다시 쓰는 손난로", "C타입 선으로 충전해 겨울 내내 반복해 씁니다", "일회용 핫팩을 사는 번거로움이 줄어듭니다"], ["3단 온도 조절", "버튼 하나로 따뜻함 정도를 고릅니다", "실내와 야외에서 알맞게 바꿔 씁니다"], ["손에 쏙 들어오는 크기", "주머니에 넣어도 부담 없는 크기입니다", "급할 때 휴대폰 보조 충전도 됩니다"]],
      "specRows": [["배터리", "5000mAh"], ["충전 단자", "USB C타입"], ["온도", "3단 조절"], ["재질", "알루미늄 + ABS"], ["구성", "본체 1개 + 충전선 1개"], ["인증", "KC 인증 제품(상세 인증번호 참조)"]],
      "caution": ["저온 화상 예방을 위해 피부에 오래 직접 대지 마세요", "충전 중에는 이불 속 등 밀폐된 곳에 두지 마세요", "어린이 손이 닿지 않는 곳에 보관해 주세요"]
    },
    "청소솔": {
      "std": ["청소솔", "틈새솔", "욕실솔", "청소브러쉬", "줄눈솔", "다용도솔"],
      "attr": ["경모", "손잡이일체형", "물빠짐", "모서리헤드", "미끄럼방지", "건조쉬움"],
      "target": ["자취방", "신혼집", "살림꾼", "원룸", "주부", "대청소"],
      "situation": ["욕실청소", "타일줄눈", "창틀청소", "주방배수구", "대청소", "이사청소"],
      "syn": ["청소브러시", "청소솔세트", "틈새브러쉬"],
      "spec": ["3개입", "26cm", "세트"],
      "en": "Crevice Cleaning Brush", "ja": "すき間掃除ブラシ",
      "problem": ["타일 줄눈의 검은 때가 일반 수세미로는 빠지지 않습니다", "창틀 구석은 손이 닿지 않아 먼지가 쌓입니다", "청소 후 솔이 잘 마르지 않아 냄새가 납니다"],
      "points": [["좁은 틈까지 닿는 헤드", "끝이 좁은 헤드가 줄눈과 창틀 구석에 들어갑니다", "닦기 힘들던 모서리를 손쉽게 문지릅니다"], ["힘이 덜 드는 손잡이", "손에 맞게 휜 손잡이로 힘을 실어 문지릅니다", "오래 청소해도 손목 부담이 줄어듭니다"], ["빨리 마르는 솔", "물빠짐 구멍이 있어 걸어 두면 금방 마릅니다", "솔에 물때가 덜 남습니다"]],
      "specRows": [["구성", "솔 3종 1세트"], ["길이", "약 26cm"], ["모", "경모 PP"], ["손잡이", "PP + 미끄럼방지 고무"], ["색상", "그레이"], ["보관", "걸이 구멍으로 걸어 건조"]],
      "caution": ["코팅·대리석 등 약한 표면은 먼저 안 보이는 곳에서 시험해 주세요", "락스 등 세제 사용 후 물로 충분히 헹궈 주세요", "모가 벌어지면 교체해 주세요"]
    }
  },
  "categories": {
    "생활용품": {"std": ["생활용품", "생활잡화", "살림템", "집수리용품", "다용도", "필수템"], "attr": ["튼튼한", "가성비", "실용적", "간편한", "가벼운", "국내배송"], "target": ["자취생", "1인가구", "신혼부부", "부모님선물", "직장인", "주부"], "situation": ["대청소", "이사", "집들이", "사계절", "선물용", "비상용"], "syn": ["생활용픔", "생필품"], "spec": ["1개", "세트"], "en": "Household Essential", "ja": "生活用品"},
    "주방용품": {"std": ["주방용품", "키친용품", "주방도구", "조리도구", "주방잡화", "살림템"], "attr": ["위생적", "세척쉬움", "내열", "스테인리스", "실리콘", "논슬립"], "target": ["자취생", "신혼부부", "요리초보", "주부", "캠핑족", "1인가구"], "situation": ["집밥", "도시락", "캠핑요리", "명절", "집들이", "주방정리"], "syn": ["주방용픔", "키친툴"], "spec": ["1개", "세트"], "en": "Kitchen Tool", "ja": "キッチン用品"},
    "가전디지털": {"std": ["가전", "디지털기기", "생활가전", "소형가전", "전자기기", "휴대용기기"], "attr": ["충전식", "저소음", "무선", "휴대용", "C타입", "LED"], "target": ["직장인", "학생", "자취생", "부모님선물", "여행객", "재택근무"], "situation": ["출퇴근", "여행", "사무실", "캠핑", "선물용", "사계절"], "syn": ["디지탈", "가전제품"], "spec": ["1개", "KC인증"], "en": "Portable Device", "ja": "ポータブル家電"},
    "패션잡화": {"std": ["패션잡화", "잡화", "액세서리", "데일리템", "패션소품", "코디템"], "attr": ["경량", "데일리", "베이직", "심플", "방수", "수납"], "target": ["남녀공용", "대학생", "직장인", "커플", "선물용", "10대"], "situation": ["데일리룩", "출근룩", "여행", "데이트", "사계절", "선물"], "syn": ["패션소픔", "잡화류"], "spec": ["프리사이즈", "1개"], "en": "Fashion Accessory", "ja": "ファッション小物"},
    "뷰티": {"std": ["뷰티", "화장품", "스킨케어", "뷰티소품", "데일리케어", "홈케어"], "attr": ["저자극", "촉촉한", "휴대용", "산뜻한", "대용량", "무향"], "target": ["여성", "남성", "민감피부", "직장인", "학생", "선물용"], "situation": ["데일리", "환절기", "여행", "출근전", "운동후", "건조한날"], "syn": ["화장픔", "뷰티템"], "spec": ["1개", "세트"], "en": "Beauty Item", "ja": "ビューティー用品"},
    "식품": {"std": ["식품", "간식", "간편식", "먹거리", "주전부리", "식재료"], "attr": ["국내산", "소포장", "간편조리", "대용량", "개별포장", "무첨가"], "target": ["자취생", "아이간식", "직장인", "캠핑족", "부모님선물", "1인가구"], "situation": ["야식", "도시락", "명절선물", "캠핑", "사무실간식", "아침대용"], "syn": ["간식거리", "먹거리추천"], "spec": ["1박스", "개별포장"], "en": "Korean Snack", "ja": "韓国食品"},
    "완구·취미": {"std": ["완구", "장난감", "취미용품", "놀이용품", "교구", "키덜트"], "attr": ["안전소재", "조립식", "휴대용", "알록달록", "교육용", "튼튼한"], "target": ["유아", "초등학생", "어린이", "키덜트", "가족", "선물용"], "situation": ["어린이날", "생일선물", "실내놀이", "크리스마스", "여행", "집콕"], "syn": ["장남감", "완구류"], "spec": ["1세트", "KC인증"], "en": "Toy & Hobby Item", "ja": "おもちゃ・ホビー"},
    "스포츠·레저": {"std": ["스포츠용품", "레저용품", "운동용품", "아웃도어", "캠핑용품", "헬스용품"], "attr": ["경량", "방수", "휴대용", "접이식", "논슬립", "내구성"], "target": ["캠핑족", "등산객", "러너", "헬스인", "낚시꾼", "가족"], "situation": ["캠핑", "등산", "홈트", "낚시", "여름휴가", "주말나들이"], "syn": ["아웃도아", "스포츠용픔"], "spec": ["1개", "세트"], "en": "Outdoor Gear", "ja": "アウトドア用品"},
    "반려동물": {"std": ["반려동물용품", "강아지용품", "고양이용품", "펫용품", "애견용품", "애묘용품"], "attr": ["안전소재", "세척쉬움", "논슬립", "소형견", "튼튼한", "부드러운"], "target": ["강아지", "고양이", "소형견", "노견", "자취생", "다견가정"], "situation": ["산책", "목욕", "여행", "실내생활", "겨울", "외출"], "syn": ["애견용픔", "펫용픔"], "spec": ["1개", "세트"], "en": "Pet Supply", "ja": "ペット用品"},
    "자동차용품": {"std": ["자동차용품", "차량용품", "카용품", "차박용품", "세차용품", "차량정리"], "attr": ["차량용", "휴대용", "논슬립", "충전식", "튼튼한", "수납"], "target": ["운전자", "초보운전", "차박족", "출퇴근", "가족", "선물용"], "situation": ["장거리운전", "세차", "차박", "겨울철", "여름철", "출퇴근"], "syn": ["차량용픔", "카악세사리"], "spec": ["1개", "세트"], "en": "Car Accessory", "ja": "カー用品"}
  },
  "generic": {
    "std": ["추천템", "인기템", "실속템", "필수품", "생활템", "꿀템"],
    "attr": ["튼튼한", "실용적", "간편한", "가벼운", "깔끔한", "국내배송"],
    "target": ["선물용", "가족", "1인가구", "부모님", "친구선물", "누구나"],
    "situation": ["사계절", "일상", "선물", "외출", "집콕", "비상용"],
    "syn": ["추천상품", "인기상품"],
    "spec": ["1개", "단품"]
  },
  "intent": {
    "정보": ["사용법", "고르는법", "후기"],
    "구매": ["구매", "추천", "가격"],
    "비교": ["비교", "차이", "종류"],
    "지역": ["당일배송", "국내배송", "빠른배송"],
    "상황": ["선물", "필수템", "꿀템"]
  },
  "lexEn": {"방수": "Waterproof", "테이프": "Tape", "누수": "Leak", "보수": "Repair", "손난로": "Hand Warmer", "핫팩": "Hand Warmer", "충전식": "Rechargeable", "청소": "Cleaning", "솔": "Brush", "브러쉬": "Brush", "틈새": "Crevice", "욕실": "Bathroom", "주방": "Kitchen", "수납": "Storage", "휴대용": "Portable", "미니": "Mini", "강력": "Strong", "다용도": "Multi-purpose", "세트": "Set", "가방": "Bag", "컵": "Cup", "수건": "Towel", "장갑": "Gloves", "양말": "Socks", "거치대": "Stand", "케이블": "Cable", "조명": "Light", "램프": "Lamp"},
  "lexJa": {"방수": "防水", "테이프": "テープ", "누수": "漏水", "보수": "補修", "손난로": "ハンドウォーマー", "핫팩": "カイロ", "충전식": "充電式", "청소": "掃除", "솔": "ブラシ", "브러쉬": "ブラシ", "틈새": "すき間", "욕실": "浴室", "주방": "キッチン", "수납": "収納", "휴대용": "携帯用", "미니": "ミニ", "강력": "強力", "다용도": "多用途", "세트": "セット", "가방": "バッグ", "컵": "カップ", "수건": "タオル", "장갑": "手袋", "양말": "靴下", "거치대": "スタンド", "케이블": "ケーブル", "조명": "ライト", "램프": "ランプ"}
},
"copy_ko": {
  "_note": "상품명·불릿·상세 블록 문구 템플릿. {kw}=핵심 키워드, {name}=상품명, {target}·{situation}·{attr}=사전에서 고른 말. 손님에게 나가는 문구에는 원가·마진·수수료 단어를 쓰지 않습니다.",
  "hooks": [
    "{situation}에 필요한 {kw}, 이제 한 번에 해결하세요",
    "{target}이 먼저 찾는 {kw}",
    "{kw} 하나로 {situation} 걱정을 덜어 보세요"
  ],
  "heroSub": "직접 써 보고 고른 {kw} · 국내 발송",
  "problemTitle": "이런 불편, 겪고 계신가요?",
  "pointTitle": "POINT",
  "specTitle": "상품 정보",
  "shipTitle": "배송 · 교환 · 반품",
  "cautionTitle": "사용 전 꼭 확인해 주세요",
  "ctaTitle": "궁금한 점은 언제든 판매자 문의로 남겨 주세요",
  "ctaSub": "판매자 문의 · 영업일 기준 순서대로 답변드립니다",
  "ship": [
    "평일 오후 2시 이전 주문은 당일 출고를 원칙으로 합니다",
    "단순 변심 교환·반품은 수령 후 7일 이내 접수해 주세요(왕복 배송비 손님 부담)",
    "상품 불량·오배송은 판매자 부담으로 교환·반품해 드립니다"
  ],
  "genericProblem": [
    "마음에 드는 {kw}를 찾느라 시간이 오래 걸립니다",
    "막상 받아 보면 설명과 달라 실망한 적이 있습니다",
    "쓰기 번거로워 결국 서랍에 넣어 두게 됩니다"
  ],
  "genericPoints": [
    ["바로 쓰는 간편함", "받자마자 꺼내 바로 쓸 수 있게 구성했습니다", "{situation}에도 번거로움 없이 씁니다"],
    ["{attr} 구성", "{attr} 특징을 살려 일상에서 손이 자주 갑니다", "{target}에게도 잘 맞습니다"],
    ["꼼꼼한 국내 발송", "출고 전 한 번 더 확인하고 보내 드립니다", "받으신 그대로 바로 사용하세요"]
  ],
  "genericCaution": [
    "모니터 환경에 따라 실제 색상이 조금 다를 수 있습니다",
    "사용 전 구성품과 사용법을 먼저 확인해 주세요",
    "용도 외 사용은 삼가 주세요"
  ],
  "story": {
    "promise": ["{kw}, {situation}을 편하게 바꿔 드립니다", "{target}을 위한 {kw}, 오늘 시작하세요"],
    "why": "{kw}를 고를 때 가장 많이 듣는 고민은 '금방 망가지지 않을까', '쓰기 어렵지 않을까'입니다. 그래서 {attr} 구성에 집중했고, 처음 쓰는 분도 설명서 없이 바로 쓸 수 있게 만들었습니다.",
    "scenes": [
      ["{situation}에", "필요한 순간 꺼내 바로 씁니다. 준비 시간이 거의 들지 않습니다."],
      ["{target}에게", "처음 써 보는 분도 어렵지 않게 다룰 수 있습니다."],
      ["보관할 때도", "부피가 크지 않아 서랍이나 가방에 넣어 두기 좋습니다."]
    ],
    "faq": [
      ["언제 받을 수 있나요?", "평일 오후 2시 이전 주문은 당일 출고를 원칙으로 하며, 보통 1~2일 안에 받아 보실 수 있습니다."],
      ["처음 써도 어렵지 않나요?", "상세페이지의 사용 순서대로 하시면 바로 쓰실 수 있습니다. 궁금한 점은 판매자 문의로 남겨 주세요."],
      ["교환·반품은 어떻게 하나요?", "수령 후 7일 이내 판매자 문의로 접수해 주세요. 불량·오배송은 판매자가 비용을 부담합니다."]
    ],
    "closing": "오늘 주문하시고 {situation} 준비를 가볍게 끝내 보세요."
  },
  "titleUse": {"생활용품": "가정용", "주방용품": "주방용", "가전디지털": "휴대용", "패션잡화": "데일리", "뷰티": "데일리", "식품": "간식용", "완구·취미": "선물용", "스포츠·레저": "야외용", "반려동물": "반려용", "자동차용품": "차량용"}
},
"copy_en": {
  "_note": "Amazon / Shopee English templates. {noun}=product noun, {cat}=category noun, {attr}=feature. No brand names, no superlatives, no emoji. Made in Korea is always stated.",
  "banned": ["best", "#1", "no.1", "number one", "perfect", "guaranteed", "guarantee", "cheapest", "100%", "top rated", "amazing"],
  "title": "{noun} - {f1}, {f2}, {use} - Made in Korea{spec}",
  "shopeeTitle": "{noun} {f1} {use} Made in Korea{spec}",
  "bullets": [
    "{F1}: {feat1} so you can {ben1} during {sit1}.",
    "{F2}: {feat2}, which helps you {ben2} at home or on the go.",
    "EASY TO USE: Ready to use right out of the box, so even first-time users can {ben3} without extra tools.",
    "MADE IN KOREA: Checked before shipping from Korea, so the {noun} arrives clean and ready for {sit2}.",
    "WHAT YOU GET: {spec2}. Simple packaging that is easy to store or give as a gift."
  ],
  "description": [
    "This {noun} is designed for everyday use. It focuses on {feat1} and {feat2}, so it fits naturally into {sit1} and {sit2}.",
    "It is lightweight and simple to handle. Open the package, follow the short guide, and start using it right away. No special tools or setup are needed.",
    "Made in Korea and inspected before shipping. Please check the size and specifications below before ordering, and contact the seller with any questions."
  ],
  "searchTerms": ["{noun}", "{cat}", "korean", "made in korea", "{f1}", "{f2}", "{use}", "gift", "home", "daily use", "portable", "easy"],
  "feat": {
    "생활용품": [["STRONG HOLD", "a firm, durable build", "fix small problems quickly"], ["SIMPLE SETUP", "a press-and-use design", "save time"], ["HOME", "home repair", "keep things tidy"]],
    "주방용품": [["HYGIENIC", "an easy-to-wash surface", "keep your kitchen clean"], ["HEAT SAFE", "heat-resistant material", "cook with confidence"], ["KITCHEN", "home cooking", "prepare meals easily"]],
    "가전디지털": [["RECHARGEABLE", "a USB-C rechargeable battery", "skip disposable products"], ["COMPACT", "a pocket-size body", "carry it every day"], ["TRAVEL", "commuting", "stay comfortable"]],
    "패션잡화": [["LIGHTWEIGHT", "a light, durable material", "wear it all day"], ["EVERYDAY STYLE", "a simple design", "match any outfit"], ["DAILY", "daily outings", "look neat"]],
    "뷰티": [["GENTLE", "a gentle formula", "care for your skin daily"], ["TRAVEL SIZE", "a compact size", "carry it anywhere"], ["DAILY CARE", "morning routines", "feel refreshed"]],
    "식품": [["INDIVIDUALLY PACKED", "individual packs", "enjoy a portion at a time"], ["EASY PREP", "quick preparation", "snack without fuss"], ["SNACK", "office breaks", "share with family"]],
    "완구·취미": [["SAFE MATERIAL", "child-friendly material", "play with peace of mind"], ["CREATIVE PLAY", "an open-ended design", "spark imagination"], ["PLAY", "indoor play", "enjoy family time"]],
    "스포츠·레저": [["OUTDOOR READY", "a weather-resistant build", "enjoy the outdoors"], ["FOLDABLE", "a compact folding design", "pack it easily"], ["OUTDOOR", "camping trips", "stay prepared"]],
    "반려동물": [["PET SAFE", "pet-friendly material", "care for your pet"], ["EASY CLEAN", "a washable surface", "keep it hygienic"], ["PET CARE", "daily walks", "keep pets comfortable"]],
    "자동차용품": [["CAR READY", "a non-slip design", "keep your car organized"], ["PORTABLE", "a compact body", "carry it on road trips"], ["DRIVING", "long drives", "drive comfortably"]]
  },
  "sits": ["winter commutes", "home repairs", "weekend cleaning", "camping trips", "daily routines", "travel"],
  "shopeeTags": ["#madeinkorea", "#koreanproduct", "#{nounTag}", "#{catTag}", "#dailyuse", "#homeessentials", "#giftidea", "#kshopping"]
},
"copy_ja": {
  "_note": "楽天・Qoo10 日本語テンプレート。ブランド名なし・最上級表現なし・絵文字なし・韓国製表記。",
  "banned": ["最高", "最安", "No.1", "ナンバーワン", "完璧", "保証", "絶対", "日本一", "世界一"],
  "title": "{noun} {f1} {use} 韓国製{spec}",
  "catch": [
    "{sit1}にちょうどいい{noun}",
    "{f1}で毎日をもっと手軽に",
    "韓国から丁寧に検品してお届けします"
  ],
  "description": "{noun}は、{f1}と{f2}を大切にした韓国製のアイテムです。{sit1}や{sit2}など、日々の暮らしの中で気軽にお使いいただけます。届いたらすぐに使える簡単な作りなので、初めての方にも扱いやすい仕様です。出荷前に一点ずつ検品しています。サイズ・仕様をご確認のうえご注文ください。",
  "keywords": ["{noun}", "{cat}", "韓国製", "韓国", "{f1}", "{f2}", "{use}", "プレゼント", "日用品", "便利グッズ"],
  "feat": {
    "생활용품": ["しっかり固定", "簡単施工", "家庭用"],
    "주방용품": ["お手入れ簡単", "耐熱素材", "キッチン用"],
    "가전디지털": ["充電式", "コンパクト", "持ち運び用"],
    "패션잡화": ["軽量", "シンプルデザイン", "毎日使い"],
    "뷰티": ["やさしい使い心地", "携帯サイズ", "毎日のケア"],
    "식품": ["個包装", "手軽", "おやつ用"],
    "완구·취미": ["安心素材", "知育", "プレゼント用"],
    "스포츠·레저": ["アウトドア対応", "折りたたみ", "キャンプ用"],
    "반려동물": ["ペットにやさしい", "洗える", "ペット用"],
    "자동차용품": ["滑り止め", "コンパクト", "車用"]
  },
  "sits": ["冬の通勤", "お家の補修", "週末の掃除", "キャンプ", "毎日の暮らし", "旅行"]
},
"blog_bones": {
  "_note": "블로그 기본 뼈대 8종 + 톤별 문장 은행. 상위 글 문장은 가져오지 않고 구조(소제목 수·순서·문단·사진 간격·첫 문단 유형·마무리 유형)만 씁니다. {kw}=키워드 {it}=지시어 {region}=지역 {m1}{m2}{m3}=현장 메모. {region}·{m*}가 든 문장은 값이 있을 때만 씁니다.",
  "bones": [
    {"id": "product", "name": "제품 사용기형", "match": ["테이프", "솔", "난로", "핫팩", "용품", "제품", "템", "기", "세트"], "it": "이 제품", "open": "공감형", "close": "요약+추천형", "photoEvery": 2, "roles": ["background", "point", "use", "tip"]},
    {"id": "place", "name": "방문 후기형", "match": ["맛집", "카페", "식당", "숙소", "펜션", "호텔", "매장", "가게"], "it": "이곳", "open": "결론선행형", "close": "재방문 의사형", "photoEvery": 1, "roles": ["background", "point", "use", "caution"]},
    {"id": "service", "name": "업체 상담기형", "match": ["업체", "시공", "수리", "인테리어", "이사", "청소업체", "견적", "학원", "병원", "상담"], "it": "이 업체", "open": "공감형", "close": "요약+추천형", "photoEvery": 2, "roles": ["background", "compare", "use", "tip"]},
    {"id": "howto", "name": "방법 안내형", "match": ["방법", "하는법", "하는 법", "셀프", "만들기", "설치"], "it": "이 방법", "open": "질문형", "close": "요약형", "photoEvery": 2, "roles": ["background", "point", "use", "caution"]},
    {"id": "compare", "name": "비교 정리형", "match": ["비교", "차이", "vs", "종류", "고르는"], "it": "이 선택", "open": "정보형", "close": "요약+추천형", "photoEvery": 2, "roles": ["background", "compare", "point", "tip"]},
    {"id": "gift", "name": "선물 추천형", "match": ["선물", "기념일", "생일", "집들이"], "it": "이 선물", "open": "공감형", "close": "추천형", "photoEvery": 2, "roles": ["background", "point", "use", "tip"]},
    {"id": "season", "name": "시즌 준비형", "match": ["겨울", "여름", "장마", "명절", "크리스마스", "환절기", "캠핑"], "it": "이 준비", "open": "공감형", "close": "요약형", "photoEvery": 2, "roles": ["background", "point", "use", "caution"]},
    {"id": "info", "name": "정보 정리형", "match": [], "it": "이 내용", "open": "정보형", "close": "요약형", "photoEvery": 2, "roles": ["background", "point", "compare", "tip"]}
  ],
  "subtitles": {
    "t1": {"background": "{kw}, 제가 직접 찾게 된 이유", "point": "써 보면서 좋았던 점", "use": "실제로 써 본 3주 기록", "compare": "전에 쓰던 것과 써 보니 달랐던 점", "tip": "제가 써 보며 터득한 요령", "caution": "써 보니 조심할 부분"},
    "t2": {"background": "{kw}를 알아보게 된 계기", "point": "알아보며 확인한 핵심", "use": "문의해 보고 정리한 과정", "compare": "여러 곳을 비교해 본 결과", "tip": "알아보면서 얻은 팁", "caution": "확인하면서 알게 된 주의점"}
  },
  "t1": {
    "intro": ["{kw} 때문에 고민하시는 분들 많으시죠. 저도 지난달까지 같은 고민을 하다가 결국 직접 사서 써 봤습니다.", "오늘은 제가 3주 동안 쓰면서 느낀 점을 솔직하게 적어 보려고 합니다.", "{region}에 사는 저는 이번 달 초에 처음 써 봤어요."],
    "background": ["처음엔 그냥 버티려고 했는데 불편이 점점 커지더라고요.", "주말 아침에 한 번 더 문제가 생기면서 더는 미루면 안 되겠다 싶었습니다.", "{m1}", "그래서 퇴근길에 바로 주문을 넣었고, 이틀 만에 받아 봤습니다.", "상자를 열어 보니 구성이 생각보다 단출해서 오히려 마음에 들었어요.", "설명서를 대충 훑고 그날 저녁에 바로 써 봤습니다."],
    "point": ["제일 먼저 느낀 건 손이 덜 간다는 점이었어요.", "처음 쓰는 저도 10분 만에 익숙해졌습니다.", "{m2}", "생각보다 가볍고 단단해서 여러 번 써도 모양이 그대로였어요.", "무엇보다 한 번 쓰고 나서 다시 손볼 일이 없었다는 게 컸습니다.", "식구들도 써 보더니 이건 계속 쓰자고 하더라고요."],
    "use": ["첫 주에는 하루에 한 번씩 써 보면서 상태를 확인했어요.", "둘째 주에는 비가 오던 날과 맑은 날을 비교해 봤습니다.", "셋째 주쯤 되니 쓰는 순서가 몸에 익어서 훨씬 빨라졌어요.", "{m3}", "제가 쓴 방식은 아주 단순해서 사진으로 순서를 남겨 두었습니다.", "중간에 한 번 실수했는데 다시 하니 금방 바로잡히더라고요."],
    "compare": ["전에 쓰던 것과 나란히 두고 써 보니 차이가 분명했어요.", "예전 것은 며칠 만에 들뜨거나 식었는데, 이번에는 그런 일이 없었습니다.", "가격만 보고 골랐던 지난번과 달리 이번엔 쓰임새를 먼저 봤어요.", "결과적으로 다시 사는 횟수가 줄어서 오히려 아껴졌습니다."],
    "tip": ["제 경험상 처음 쓰기 전에 주변을 깨끗이 닦아 두면 훨씬 잘 됩니다.", "한 번에 다 하려고 하지 말고 나눠서 하시는 게 편했어요.", "다 쓰고 나면 바로 정리해 두는 습관이 오래 쓰는 비결이었습니다.", "저는 자주 쓰는 자리에 하나 더 두고 쓰고 있어요."],
    "caution": ["다만 젖은 상태에서 바로 쓰면 효과가 덜했어요.", "아이들 손이 닿는 곳에는 두지 않는 게 좋겠더라고요.", "제 경우엔 설명서에 적힌 순서를 지켰을 때 결과가 가장 좋았습니다."],
    "close": ["3주 써 본 지금은 같은 고민을 하는 지인에게 먼저 권하고 있어요.", "{kw}를 고민 중이시라면 제 기록이 작은 참고가 되면 좋겠습니다.", "궁금한 점은 댓글로 남겨 주시면 제가 써 본 범위에서 답해 드릴게요."],
    "extra": ["사진을 보시면 전후 차이가 조금 더 잘 보이실 거예요.", "써 본 날짜와 상황을 같이 적어 두니 나중에 비교하기도 좋았습니다.", "저처럼 손재주가 없는 사람도 어렵지 않게 해냈어요.", "다음에 다시 산다면 같은 걸 고를 것 같아요."]
  },
  "t2": {
    "intro": ["요즘 {kw}를 알아보는 분들이 부쩍 많아졌더라고요.", "저도 주변에서 추천을 받기 전에 직접 하나하나 확인해 보고 싶어서 꽤 오래 알아봤습니다.", "{region} 근처에서 알아보다가 정리한 내용을 공유합니다."],
    "background": ["처음에는 어디서부터 찾아봐야 할지 막막했어요.", "후기만 보고 고르기엔 서로 말이 달라서 직접 확인해 보기로 했습니다.", "{m1}", "판매처 세 곳에 문의를 넣어 같은 질문을 똑같이 해 봤어요.", "답변 속도와 설명의 친절함부터 차이가 나더라고요.", "그 과정에서 꼭 따져 봐야 할 기준이 몇 가지로 좁혀졌습니다."],
    "point": ["문의해 보니 가장 많이 강조한 건 쓰임새와 관리 방법이었어요.", "구성품과 규격을 표로 정리해서 보내 준 곳도 있었습니다.", "{m2}", "같은 이름이라도 재질과 크기가 제각각이라 상세 정보를 꼼꼼히 봐야겠더라고요.", "배송과 교환 조건도 미리 확인해 두니 마음이 놓였습니다.", "확인한 내용을 메모해 두니 비교가 한결 쉬웠어요."],
    "use": ["알아본 순서를 그대로 적어 보면 이렇습니다.", "먼저 필요한 용도를 정하고, 그다음 크기와 수량을 정했어요.", "그 뒤에 판매처마다 같은 조건으로 견적과 구성을 받아 봤습니다.", "{m3}", "마지막으로 사진과 실제 설명이 맞는지 다시 물어봤어요.", "이렇게 하니 고르는 시간이 오히려 줄었습니다."],
    "compare": ["세 곳을 비교해 보니 설명이 구체적인 곳이 결국 믿음이 가더라고요.", "가격 차이보다 구성과 사후 응대 차이가 더 컸습니다.", "조건을 표로 나란히 놓고 보니 판단이 금방 섰어요.", "비교 기준을 미리 정해 두지 않았다면 한참 헤맸을 것 같습니다."],
    "tip": ["알아보실 때는 질문 목록을 미리 적어 두시길 권해요.", "같은 질문을 여러 곳에 똑같이 하면 차이가 선명하게 보입니다.", "상세페이지의 규격 표를 캡처해 두면 나중에 확인하기 편했어요.", "교환 조건은 주문 전에 꼭 물어보시는 게 좋겠습니다."],
    "caution": ["확인해 보니 같은 이름의 다른 규격 상품이 섞여 있었어요.", "사진만 보고 판단하면 실제 크기를 오해하기 쉽더라고요.", "계절이나 사용 환경에 따라 맞는 제품이 다르다는 답변도 받았습니다."],
    "close": ["알아본 내용을 정리해 보니 결국 내 상황에 맞는 기준이 제일 중요했어요.", "{kw}를 찾고 계신 분들께 이 정리가 시간을 줄여 드리면 좋겠습니다.", "더 확인하고 싶은 부분은 댓글로 남겨 주시면 아는 범위에서 알려 드릴게요."],
    "extra": ["문의 답변을 캡처해 두니 나중에 다시 볼 때도 편했어요.", "비교표를 만들어 두면 가족과 상의하기도 쉬워집니다.", "시간을 들여 알아본 만큼 결정은 금방 내려졌어요.", "다음에 비슷한 걸 고를 때도 같은 순서로 알아볼 생각입니다."]
  },
  "photoHint": "사진을 넣으시면 노출이 더 좋아집니다"
},
"insta_copy": {
  "_note": "인스타 업종별 훅·본문·태그 템플릿. 자동 발행·로그인·좋아요·팔로우 기능 없음 — 작성만 합니다.",
  "tones": ["감성", "정보", "유머"],
  "hooks": {
    "질문형": ["{topic}, 아직도 고민 중이세요?", "{topic} 해 보셨나요?", "{topic}, 뭐부터 하세요?"],
    "수치형": ["{topic} 3가지만 기억하세요", "{topic} 5분이면 끝나요", "{topic} 딱 3단계 정리"],
    "공감형": ["{topic}, 저만 어려웠던 거 아니죠", "{topic} 하다 지친 날 보세요", "{topic} 다들 이런 적 있죠"]
  },
  "body": {
    "감성": {
      "open": ["{region}의 하루가 조금 더 따뜻해지는 이야기예요.", "오늘은 {topic} 이야기를 천천히 꺼내 볼게요."],
      "mid": ["작은 변화가 하루의 결을 바꾸더라고요. {biz}에서 준비한 건 거창한 게 아니라, 매일 손이 가는 사소한 편안함이에요.", "사진 속 장면은 연출 없이 그대로 담았어요. 직접 보고 만지고 고른 것만 소개하고 싶었거든요.", "바쁜 날일수록 나를 챙기는 시간이 필요하다고 생각해요. 이 게시물이 잠깐 쉬어 가는 쉼표가 되면 좋겠어요."],
      "close": ["마음에 닿았다면 저장해 두고 필요할 때 다시 꺼내 보세요."]
    },
    "정보": {
      "open": ["{topic}, 핵심만 정리해 드릴게요.", "{region}에서 자주 받는 질문을 모았어요."],
      "mid": ["첫째, 목적부터 정하세요. 무엇을 바꾸고 싶은지 한 줄로 적으면 고르는 시간이 줄어요.", "둘째, 순서를 지키세요. {biz}에서 알려 드리는 순서대로 하면 처음이어도 실수가 적어요.", "셋째, 기록하세요. 전후 사진을 남겨 두면 다음에 훨씬 쉬워져요."],
      "close": ["나중에 다시 보려면 저장, 필요한 친구에게는 공유해 주세요."]
    },
    "유머": {
      "open": ["{topic} 하려다 하루가 다 갔다면 손 들어 주세요.", "오늘의 주제는 {topic}입니다. 진지하게 웃기게 가 볼게요."],
      "mid": ["계획은 늘 그럴듯한데 실행은 늘 내일이죠. 그래서 {biz}가 준비했어요, 오늘 바로 할 수 있는 버전으로요.", "1단계 일단 시작하기, 2단계 사진 찍기, 3단계 자랑하기. 사실 3단계가 제일 중요해요.", "어렵게 생각하면 끝도 없지만 한 번 해 보면 생각보다 별거 아니더라고요."],
      "close": ["공감 가면 저장, 이 친구 생각나면 공유 부탁해요."]
    }
  },
  "tags": {
    "big": ["일상", "데일리", "추천", "소통", "오늘", "꿀팁", "정보공유", "주말", "인스타그램", "좋은하루"],
    "biz": {
      "카페": ["카페", "카페추천", "디저트", "커피", "카페투어", "브런치", "카페스타그램", "디저트맛집", "커피맛집", "신메뉴", "라떼", "케이크"],
      "음식점": ["맛집", "맛집추천", "점심메뉴", "저녁메뉴", "먹스타그램", "맛스타그램", "한식", "외식", "회식장소", "데이트맛집", "혼밥", "포장맛집"],
      "미용": ["미용실", "헤어", "헤어스타일", "펌", "염색", "커트", "헤어추천", "뷰티", "헤어살롱", "남자머리", "여자머리", "스타일링"],
      "쇼핑몰": ["쇼핑", "온라인쇼핑", "살림템", "생활용품", "추천템", "꿀템", "신상", "데일리템", "선물추천", "집꾸미기", "생활꿀팁", "오늘의발견"],
      "부동산": ["부동산", "부동산정보", "내집마련", "전세", "월세", "매매", "아파트", "부동산상담", "이사", "신혼집", "투자공부", "집구하기"],
      "학원": ["학원", "공부", "공부스타그램", "수학", "영어", "입시", "교육", "자기계발", "독서", "시험공부", "스터디", "성적향상"],
      "기타": ["소상공인", "가게", "사장님", "가게추천", "동네가게", "로컬", "브랜드", "작은가게", "오픈", "신규오픈", "단골", "자영업"]
    },
    "local": ["{region}", "{region}맛집", "{region}카페", "{region}추천", "{region}일상", "{region}가볼만한곳", "{region}핫플", "{region}소상공인", "{region}동네", "{region}데이트", "{region}주말", "{region}생활"]
  },
  "comment": {
    "question": ["여러분은 {topic} 할 때 무엇부터 하세요?", "{topic} 관련해서 더 궁금한 점 있으세요?"],
    "guide": "더 자세한 건 프로필 링크에서 확인하세요."
  }
},
"sample_products": {
  "_note": "검수용 샘플 3종(가상 상품, 실제 업체·실명 없음). blogTop 5편은 뼈대 추출 시험용으로 이 저장소에서 새로 쓴 가상 글입니다(외부 글 복제 아님).",
  "products": [
    {"name": "방수테이프", "keyword": "방수테이프", "cost": 3200, "cat": "생활용품", "spec": "120g · 10cm×5m", "weight": 120, "size": "10×10×5cm", "ship": 0, "margin": 22, "vat": "tax", "brand": "자체브랜드", "origin": "국산", "price": 0, "link": "https://example.com/goods/view?goodsNo=1234567", "en": "Waterproof Repair Tape", "ja": "防水補修テープ"},
    {"name": "충전식 손난로", "keyword": "손난로", "cost": 8900, "cat": "가전디지털", "spec": "180g · 5000mAh", "weight": 180, "size": "10×6×2cm", "ship": 3000, "margin": 22, "vat": "tax", "brand": "자체브랜드", "origin": "중국(OEM)", "price": 0, "link": "", "en": "Rechargeable Hand Warmer", "ja": "充電式ハンドウォーマー"},
    {"name": "틈새 청소솔 3종", "keyword": "청소솔", "cost": 2100, "cat": "생활용품", "spec": "150g · 26cm 3종", "weight": 150, "size": "28×8×4cm", "ship": 2500, "margin": 22, "vat": "tax", "brand": "자체브랜드", "origin": "국산", "price": 0, "link": "", "en": "Crevice Cleaning Brush Set", "ja": "すき間掃除ブラシ 3本セット"}
  ],
  "global": {
    "us": {"price": 19.9, "method": "소포"},
    "jp": {"price": 2480, "method": "소포"},
    "sea": {"price": 390, "method": "소포", "country": "TW"}
  },
  "blog": {
    "keyword": "방수테이프",
    "region": "수원",
    "memo": "베란다 창틀 아래 물자국이 생김\n폭 10cm 롤을 30cm씩 잘라 붙임\n비 온 다음 날 확인했더니 물자국 없음",
    "tone": "t1"
  },
  "blogTop": [
    "창틀 누수 때문에 밤잠을 설쳤던 기억이 납니다. 여러분도 비 소식만 들리면 걱정되시죠?\n\n## 누수 위치 찾기\n물이 떨어지는 자리 바로 위가 원인이 아닐 때가 많습니다. 실리콘이 갈라진 곳부터 손전등으로 살펴봅니다.\n사진처럼 갈라진 틈이 보이면 거기서부터 시작합니다.\n\n## 준비물 챙기기\n장갑과 마른 걸레, 그리고 접착 테이프 한 롤이면 충분했습니다. 커터칼도 하나 있으면 편합니다.\n\n## 붙이는 순서\n먼저 먼지를 닦고 완전히 말립니다. 그다음 테이프를 길게 대고 가운데부터 밀어 붙였습니다. 모서리는 한 번 더 눌러 줍니다.\n\n## 일주일 뒤\n큰비가 두 번 왔는데 바닥이 말라 있었습니다. 방수테이프 덕분에 업체를 부르지 않아도 됐어요.\n\n정리하면 위치 확인, 건조, 압착 세 가지만 지키면 됩니다. 도움이 되셨다면 공감 부탁드려요.",
    "결론부터 말하면 부틸 재질이 가장 오래 버텼습니다.\n\n## 세 가지 재질 비교\n알루미늄 면, 부틸 고무, 일반 비닐 세 종류를 같은 벽에 붙여 봤어요. 한 달 동안 매주 사진을 찍었습니다.\n\n## 접착력\n비닐은 2주 차에 모서리가 들떴습니다. 나머지 둘은 그대로였어요.\n\n## 가격 대비\n롤 길이가 달라서 1미터당 값으로 계산했습니다. 차이는 생각보다 크지 않았어요.\n\n방수테이프를 고르실 때는 재질부터 확인하시길 권합니다.",
    "장마 오기 전에 옥상 점검하셨나요?\n\n## 옥상 배수구\n낙엽이 쌓이면 물이 고이고, 고인 물은 결국 틈을 찾아 내려옵니다. 배수구부터 비워 주세요.\n\n## 갈라진 모서리\n벽과 바닥이 만나는 모서리가 가장 약합니다. 여기는 넓은 폭으로 덮어 주는 게 좋습니다.\n\n## 마무리 점검\n작업 후 물을 한 바가지 부어 보면 확인이 쉽습니다.\n\n올해 장마는 걱정 없이 보내시길 바랍니다.",
    "이번에 이사 온 집 베란다에 물자국이 있어서 관리사무소에 물어봤습니다.\n\n## 관리사무소 답변\n공용부가 아니라 세대 내부라서 직접 처리해야 한다는 답을 들었어요.\n\n## 업체 견적\n두 군데 견적을 받았는데 출장비만 꽤 나왔습니다.\n\n## 셀프로 결정\n결국 테이프로 먼저 막아 보고 안 되면 부르기로 했어요. 지금까지는 괜찮습니다.\n\n## 남은 숙제\n겨울에 결로가 생기는지 한 번 더 지켜볼 예정입니다.\n\n비슷한 상황이시면 먼저 관리사무소에 물어보세요.",
    "방수 작업할 때 자주 하는 실수 다섯 가지를 모았습니다.\n\n## 젖은 면에 바로 붙이기\n물기가 남아 있으면 금방 떨어집니다.\n\n## 너무 짧게 자르기\n틈보다 양쪽으로 5센티씩 넉넉하게 덮어야 합니다.\n\n## 공기 방울 방치\n가운데부터 바깥으로 밀어내야 합니다.\n\n이 세 가지만 피해도 결과가 달라집니다. 방수테이프 작업 전에 꼭 확인하세요."
  ],
  "insta": {"topic": "겨울 손난로 고르는 법", "biz": "쇼핑몰", "region": "수원", "tone": "정보"}
},
"upload_ps1": "# 쿠팡 오픈 API 상품 등록 — 서명·전송 스크립트 (PowerShell 5.1 그대로 실행, 템플릿)\n# · 열쇠는 이 파일에 쓰지 않습니다. 실행 창에서만 환경변수로 넣으세요:\n#     $env:COUPANG_ACCESS_KEY = \u0027...\u0027; $env:COUPANG_SECRET_KEY = \u0027...\u0027; $env:COUPANG_VENDOR_ID = \u0027A0...\u0027\n# · 기본은 미리보기(-WhatIf): 요청 본문·서명·헤더만 출력하고 아무것도 보내지 않습니다.\n# · 실제 전송은 -Send 를 붙였을 때만 합니다.\n#     powershell -ExecutionPolicy Bypass -File upload_coupang.ps1                 (미리보기)\n#     powershell -ExecutionPolicy Bypass -File upload_coupang.ps1 -Send           (실제 전송)\n# · 서명 규칙(쿠팡 HMAC): message = signedDate + method + path + query (\u0027?\u0027 없이), HMAC-SHA256(secretKey) → hex 소문자\n#   signedDate 형식 yyMMdd\u0027T\u0027HHmmss\u0027Z\u0027 (GMT)\nparam(\n  [string]$BodyFile = \u0027\u0027,\n  [string]$SignedDate = \u0027\u0027,\n  [string]$Method = \u0027POST\u0027,\n  [string]$Path = \u0027/v2/providers/seller_api/apis/api/v1/marketplace/seller-products\u0027,\n  [string]$Query = \u0027\u0027,\n  [switch]$WhatIf,\n  [switch]$Send\n)\n$ErrorActionPreference = \u0027Stop\u0027\n[Console]::OutputEncoding = [Text.Encoding]::UTF8\n$ApiHost = \u0027https://api-gateway.coupang.com\u0027\nif (-not $BodyFile) { $BodyFile = Join-Path $PSScriptRoot \u0027coupang_body.json\u0027 }\n\n$ak = $env:COUPANG_ACCESS_KEY\n$sk = $env:COUPANG_SECRET_KEY\n$vendor = $env:COUPANG_VENDOR_ID\n\nif (-not $SignedDate) { $SignedDate = [DateTime]::UtcNow.ToString(\"yyMMdd\u0027T\u0027HHmmss\u0027Z\u0027\", [Globalization.CultureInfo]::InvariantCulture) }\n$message = $SignedDate + $Method + $Path + $Query\n\n$sig = \u0027\u0027\nif ($sk) {\n  $hm = New-Object System.Security.Cryptography.HMACSHA256 (, [Text.Encoding]::UTF8.GetBytes($sk))\n  $sig = -join ($hm.ComputeHash([Text.Encoding]::UTF8.GetBytes($message)) | ForEach-Object { $_.ToString(\u0027x2\u0027) })\n}\n$auth = \u0027CEA algorithm=HmacSHA256, access-key=\u0027 + $ak + \u0027, signed-date=\u0027 + $SignedDate + \u0027, signature=\u0027 + $sig\n$authMasked = \u0027CEA algorithm=HmacSHA256, access-key=***, signed-date=\u0027 + $SignedDate + \u0027, signature=\u0027 + $sig\n\n$body = \u0027\u0027\nif (Test-Path $BodyFile) {\n  $body = [IO.File]::ReadAllText($BodyFile, [Text.Encoding]::UTF8)\n  if ($vendor) { $body = $body.Replace(\u0027\"VENDOR_ID\"\u0027, \u0027\"\u0027 + $vendor + \u0027\"\u0027) }\n}\n\nWrite-Output (\u0027MESSAGE=\u0027 + $message)\nWrite-Output (\u0027SIGNATURE=\u0027 + $(if ($sig) { $sig } else { \u0027(SECRET 없음 - 서명 생략)\u0027 }))\nWrite-Output (\u0027AUTHORIZATION=\u0027 + $authMasked)\nWrite-Output (\u0027URL=\u0027 + $ApiHost + $Path + $(if ($Query) { \u0027?\u0027 + $Query } else { \u0027\u0027 }))\nWrite-Output (\u0027BODY_BYTES=\u0027 + [Text.Encoding]::UTF8.GetByteCount($body))\n\nif (-not $Send) {\n  Write-Output \u0027MODE=WhatIf (미리보기 - 아무것도 보내지 않았습니다. 실제 전송은 -Send)\u0027\n  exit 0\n}\nif (-not $ak -or -not $sk) { Write-Output \u0027ERROR=환경변수 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 비어 있습니다\u0027; exit 3 }\nif (-not $body) { Write-Output (\u0027ERROR=요청 본문 파일이 없습니다: \u0027 + $BodyFile); exit 4 }\nif ($body.Contains(\u0027\"VENDOR_ID\"\u0027)) { Write-Output \u0027ERROR=업체코드(COUPANG_VENDOR_ID)를 넣어 주세요\u0027; exit 5 }\n\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12\n$uri = $ApiHost + $Path + $(if ($Query) { \u0027?\u0027 + $Query } else { \u0027\u0027 })\ntry {\n  $r = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $uri -Headers @{ Authorization = $auth; \u0027X-EXTENDED-TIMEOUT\u0027 = \u002790000\u0027 } -ContentType \u0027application/json;charset=UTF-8\u0027 -Body ([Text.Encoding]::UTF8.GetBytes($body))\n  Write-Output (\u0027STATUS=\u0027 + $r.StatusCode)\n  Write-Output $r.Content\n} catch {\n  Write-Output (\u0027ERROR=\u0027 + $_.Exception.Message)\n  try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Output $sr.ReadToEnd() } catch {}\n  exit 6\n}\n"
};
