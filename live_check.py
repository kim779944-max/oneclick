import json, os
from playwright.sync_api import sync_playwright

out = '/workspace/output'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/workspace/toolchain/chrome-headless-shell-linux64/chrome-headless-shell", args=["--no-sandbox"])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='ko-KR', accept_downloads=True)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR:' + str(e)))

    pg.goto('https://autooneclick.com/slope/', wait_until='domcontentloaded')
    pg.wait_for_timeout(11000)
    res['slope_ver'] = pg.evaluate("({arrow:!!document.querySelector('#togs button[data-l=\"arrow\"]'),keyHidden:document.getElementById('keyBox').classList.contains('hide'),chk:!!document.getElementById('chkGo'),res:!!document.getElementById('res')})")
    res['slope_ktserr'] = pg.evaluate('window.__KTS_ERR||[]')
    pg.evaluate("document.getElementById('mapCard').scrollIntoView({block:'start'})")
    pg.wait_for_timeout(700)
    pg.screenshot(path=f'{out}/2트랙_라이브_경사도_390.png')
    pg.click('#chkGo'); pg.wait_for_timeout(1500)
    res['slope_resOpen'] = pg.evaluate("document.getElementById('res').classList.contains('on')")
    pg.screenshot(path=f'{out}/2트랙_라이브_경사도_전체뷰_390.png')

    pg.goto('https://autooneclick.com/redev/', wait_until='domcontentloaded')
    pg.wait_for_timeout(3000)
    res['redev'] = pg.evaluate("({tabs:[...document.querySelectorAll('#tabs button')].map(b=>b.getAttribute('data-t')), stats:['stS','stG','stN','stM'].map(i=>document.getElementById(i).textContent), cnt:document.getElementById('cnt').textContent})")
    pg.screenshot(path=f'{out}/2트랙_라이브_재개발_390.png')
    pg.click('#tabs button[data-t="moa"]'); pg.wait_for_timeout(800)
    res['moa_cnt'] = pg.evaluate("document.getElementById('cnt').textContent")
    pg.screenshot(path=f'{out}/2트랙_라이브_모아타운_390.png')
    pg.fill('#q', '번동 411'); pg.wait_for_timeout(700)
    pg.click('#list .item'); pg.wait_for_timeout(800)
    res['moa_sheet'] = pg.evaluate("document.querySelector('#sheet .dt h3')?.textContent")
    res['moa_act'] = pg.evaluate("!!document.querySelector('#sheet .sact')")
    pg.screenshot(path=f'{out}/2트랙_라이브_모아타운_확인결과_390.png')
    with pg.expect_download() as dl:
        pg.click('#sheet .sact button[data-act="save"]')
    d = dl.value; d.save_as(f'{out}/2트랙_라이브_모아타운_저장카드.png')
    res['live_download'] = os.path.getsize(f'{out}/2트랙_라이브_모아타운_저장카드.png')
    res['redev_err'] = errs[:5]
    res['redev_overflow'] = pg.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
