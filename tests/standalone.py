"""Exercise the downloadable single HTML without an API, resources or Internet."""
import functools
import http.server
import os
import shutil
import tempfile
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with tempfile.TemporaryDirectory(prefix='shohstore-standalone-') as tmp:
 shutil.copy2(ROOT/'index.html',Path(tmp)/'index.html')
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=tmp));threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('request',lambda r:requests.append(r.url) if not r.url.startswith('data:') else None)
   page.goto(url,wait_until='networkidle');expect(page.locator('.home-offers .product-card')).to_have_count(6);expect(page.locator('.standalone-notice')).to_be_visible();expect(page.locator('.hero-pc-art svg')).to_be_visible();assert page.evaluate('document.fonts.status')=='loaded'
   page.screenshot(path=str(OUT/'standalone-desktop.png'),full_page=True)
   page.locator('.catalog-button').click();expect(page.locator('.catalog-grid .product-card')).to_have_count(24);assert page.url.endswith('#/catalog')
   page.locator('.search input').fill('G102 LIGHTSYNC');expect(page.locator('.product-card')).to_have_count(1);page.reload(wait_until='networkidle');expect(page.locator('.product-card')).to_have_count(1)
   page.locator('.search input').fill('');page.locator('.catalog-category-list button').filter(has=page.get_by_text('Процессоры',exact=True)).click();expect(page.locator('.catalog-heading h1')).to_have_text('Процессоры');expect(page.locator('.product-card')).to_have_count(6)
   page.get_by_role('button',name='В сборку AMD Ryzen 7 7800X3D',exact=True).click();expect(page.locator('.detail-info h1')).to_have_text('AMD Ryzen 7 7800X3D');assert page.url.endswith('#/product/ryzen-7-7800x3d');expect(page.locator('.specs-section dl>div')).to_have_count(12)
   page.reload(wait_until='networkidle');expect(page.locator('.cart-button b')).to_have_text('1');page.locator('.cart-button').click();expect(page.locator('.cart-slots .filled')).to_have_count(1);expect(page.locator('.cart-visual [data-component=cpu]')).to_have_attribute('data-installed','true');expect(page.locator('.cart-summary strong')).to_contain_text('4\xa0790\xa0000');page.locator('.cart-summary .primary').click();expect(page.locator('.dialog .launch-instructions')).to_be_visible();expect(page.locator('input[name=code]')).to_have_count(0);page.locator('.dialog-close').click()
   page.locator('.header .logo').click();expect(page.locator('.hero h1')).to_be_visible();page.locator('.theme-button').click()
   for language,text in [('en','Big ideas.'),('uz','Katta g‘oyalar.'),('ru','Большие идеи.')]:page.locator('.language-control select').select_option(language);expect(page.locator('.hero h1')).to_contain_text(text)
   page.locator('.theme-button').click();page.locator('.catalog-button').click();expect(page.locator('.catalog-page')).to_be_visible();page.locator('.catalog-category-list button').filter(has=page.get_by_text('Клавиатуры',exact=True)).click();expect(page.locator('.catalog-heading h1')).to_have_text('Клавиатуры')
   page.locator('.product-card').first.locator('.favorite-button').click();page.locator('.favorites-filter').click();expect(page.locator('.product-card')).to_have_count(1);page.locator('.favorites-filter').click();expect(page.locator('.product-card')).to_have_count(6)
   for language in ['ru','uz','en']:
    page.locator('.language-control select').select_option(language)
    for width in [320,390,768,1440]:page.set_viewport_size({'width':width,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(language,width)
   page.set_viewport_size({'width':390,'height':844});page.locator('.language-control select').select_option('ru');page.screenshot(path=str(OUT/'standalone-mobile.png'),full_page=True)
   assert all(request.split('#')[0]==url for request in requests),requests;assert not errors,errors
   corrupted=browser.new_page();corrupted.add_init_script("localStorage.setItem('shoh-favorites','{}');localStorage.setItem('shoh-cart','\\\"invalid\\\"');");corrupted.on('pageerror',lambda e:errors.append(str(e)));corrupted.goto(url+'#/product/%',wait_until='networkidle');expect(corrupted.locator('.empty-area h2')).to_have_text('Ничего не нашли');corrupted.locator('.header .logo').click();expect(corrupted.locator('.home-offers .product-card')).to_have_count(6)
   denied=browser.new_page();denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})");denied.on('pageerror',lambda e:errors.append(str(e)));denied.goto(url,wait_until='networkidle');expect(denied.locator('.product-card')).to_have_count(6);denied.locator('.product-card').first.locator('.add-button').click();expect(denied.locator('.cart-button b')).to_have_text('1');denied.locator('.theme-button').click();expect(denied.locator('html')).to_have_attribute('data-theme','dark')
   offline=browser.new_context(offline=True);opaque=offline.new_page();opaque.on('pageerror',lambda e:errors.append(str(e)));opaque.set_content((ROOT/'index.html').read_text(),wait_until='load');assert opaque.evaluate('location.origin')=='null';expect(opaque.locator('.product-card')).to_have_count(6);expect(opaque.locator('.hero-pc-art svg')).to_be_visible();opaque.locator('.product-card').first.locator('.add-button').click();expect(opaque.locator('.cart-button b')).to_have_text('1');opaque.locator('.header .logo').click();expect(opaque.locator('.hero h1')).to_be_visible();opaque.locator('.catalog-button').click();expect(opaque.locator('.catalog-grid .product-card')).to_have_count(24);assert not errors,errors
   offline.close();browser.close()
   print('PASS: self-contained offline HTML, promotions, separate catalog and persistent search, 6-item category, specifications, cart diagram, favorites, 3 languages, responsive typography, blocked/corrupted storage, opaque origin; no API/CDN requests or browser errors.')
 finally:server.shutdown();server.server_close()
