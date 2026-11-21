import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/workspace/toolchain/chrome-headless-shell-linux64/chrome-headless-shell", args=["--no-sandbox"])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='ko-KR')
    pg = ctx.new_page()
    pg.goto('https://autooneclick.com/slope/', wait_until='domcontentloaded')
    pg.wait_for_timeout(9000)
    info = pg.evaluate("""(()=>{
      const t=document.getElementById('togs');
      const bs=[...t.querySelectorAll('button')];
      const r=t.getBoundingClientRect();
      return {togs:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
        scroll:[t.scrollWidth,t.clientWidth], count:bs.length,
        tops:bs.map(b=>Math.round(b.getBoundingClientRect().top)),
        labels:bs.map(b=>b.textContent.trim().slice(0,10))};
    })()""")
    print(json.dumps(info, ensure_ascii=False, indent=1))
    pg.evaluate("document.getElementById('togs').scrollIntoView({block:'center'})")
    pg.wait_for_timeout(800)
    pg.screenshot(path='/workspace/output/2트랙_라이브_토글확인.png')
    b.close()
