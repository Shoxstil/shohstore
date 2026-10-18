"""Production browser checks against a temporary database; build first."""
import os
import re
import secrets
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
CATEGORIES={'cpu':'Процессоры','gpu':'Видеокарты','mb-amd':'Материнские платы AMD','mb-intel':'Материнские платы Intel','ram':'Оперативная память','ssd':'SSD-накопители','psu':'Блоки питания','liquid':'Водяное охлаждение','cooler':'Кулеры','case':'Корпуса','build':'Готовые сборки','mouse':'Мыши','keyboard':'Клавиатуры','headset':'Наушники'}
with tempfile.TemporaryDirectory(prefix='shohstore-browser-') as tmp:
 code=secrets.token_urlsafe(18)
 env={**os.environ,'SHOHSTORE_DB':str(Path(tmp)/'store.sqlite'),'PORT':'3198','SHOHSTORE_ADMIN_NAME':'Browser Admin','SHOHSTORE_ADMIN_CODE':code}
 subprocess.run(['node','server/admin.mjs'],cwd=ROOT,env=env,check=True,capture_output=True)
 log=open(Path(tmp)/'server.log','w+')
 server=subprocess.Popen(['node','server/index.mjs'],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  for _ in range(60):
   try:urllib.request.urlopen('http://127.0.0.1:3198/api/health',timeout=1);break
   except Exception:time.sleep(.1)
  else:raise RuntimeError('Server did not become ready')
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
   def stable():page.wait_for_function("(()=>{const e=document.querySelector('.page-shell');return e&&!e.classList.contains('leaving')&&getComputedStyle(e).opacity==='1'})()")
   def category(c,count=6):
    stable()
    if not page.locator('.catalog-page').count():page.locator('.catalog-button').click();expect(page.locator('.catalog-page')).to_be_visible()
    page.locator('.catalog-category-list button').filter(has=page.get_by_text(CATEGORIES[c],exact=True)).click()
    expect(page.locator('.catalog-heading h1')).to_have_text(CATEGORIES[c])
    expect(page.locator('.catalog-grid .product-card')).to_have_count(count)
   page.goto('http://127.0.0.1:3198',wait_until='networkidle')
   expect(page.locator('.home-offers .product-card')).to_have_count(6)
   expect(page.locator('.home-offers .badge.sale')).to_have_count(6)
   expect(page.locator('.catalog-page')).to_have_count(0)
   expect(page.locator('.hero-pc-art svg')).to_be_visible()
   expect(page.locator('.hero-pc-art [data-component=liquid]')).to_have_count(1);expect(page.locator('.hero-pc-art [data-component=cooler]')).to_have_count(0)
   assert float(page.locator('.hero-content>p').evaluate('e=>getComputedStyle(e).fontSize').replace('px',''))>=16
   page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
   page.locator('.catalog-button').click()
   expect(page).to_have_url('http://127.0.0.1:3198/catalog')
   expect(page.locator('.catalog-grid .product-card')).to_have_count(24)
   for count in [48,72,84]:
    page.locator('.catalog-results .show-all-button').click();expect(page.locator('.catalog-grid .product-card')).to_have_count(count)
   for c in CATEGORIES:category(c)
   category('mouse');stable();page.screenshot(path=str(OUT/'catalog.png'),full_page=True)
   page.locator('.catalog-button').click()
   page.locator('.search input').fill('G102 LIGHTSYNC')
   expect(page.locator('.product-card')).to_have_count(1)
   expect(page.locator('.product-name')).to_have_text('Logitech G102 LIGHTSYNC')
   page.reload(wait_until='networkidle');expect(page.locator('.product-card')).to_have_count(1)
   page.locator('.search input').fill('no-such-component')
   expect(page.locator('.empty-area h2')).to_have_text('Ничего не нашли')
   page.locator('.search input').fill('');expect(page.locator('.product-card')).to_have_count(24)
   page.locator('.sort-select select').select_option('asc');expect(page.locator('.product-name').first).to_have_text('Logitech G102 LIGHTSYNC')
   page.locator('.sort-select select').select_option('featured')
   category('cpu')
   page.get_by_role('button',name='В сборку AMD Ryzen 7 7800X3D',exact=True).click()
   expect(page).to_have_url('http://127.0.0.1:3198/product/ryzen-7-7800x3d')
   expect(page.locator('.specs-section dl>div')).to_have_count(12)
   expect(page.locator('.detail-info>p')).to_contain_text('96 MB')
   page.locator('.back-link').click();expect(page.locator('.catalog-heading h1')).to_have_text('Процессоры')
   category('mb-amd');page.get_by_role('button',name='В сборку ASUS TUF Gaming B650-PLUS',exact=True).click()
   page.locator('.cart-button').click();expect(page.locator('.cart-slots .filled')).to_have_count(2)
   expect(page.locator('.cart-visual [data-component=cpu]')).to_have_attribute('data-installed','true')
   expect(page.locator('.compatibility.good')).to_be_visible()
   expect(page.locator('.cart-summary strong')).to_contain_text('7\xa0580\xa0000')
   quantity=page.locator('.cart-item').first.locator('.quantity')
   quantity.locator('button').last.click();expect(page.locator('.cart-summary strong')).to_contain_text('12\xa0370\xa0000')
   quantity.locator('button').first.click();page.locator('.dialog-close').click()
   for c,model in [('mouse','Logitech G502 HERO'),('keyboard','HyperX Alloy Core RGB'),('headset','HyperX Cloud II')]:
    category(c);page.get_by_role('button',name='В сборку '+model,exact=True).click();expect(page.locator('.detail-info h1')).to_have_text(model)
   page.locator('.cart-button').click();expect(page.locator('.cart-peripherals .filled')).to_have_count(3)
   expect(page.locator('.cart-summary strong')).to_contain_text('10\xa0150\xa0000')
   page.locator('.dialog-close').click();page.reload(wait_until='networkidle');expect(page.locator('.cart-button b')).to_have_text('5')
   page.locator('.cart-button').click();page.locator('.cart-summary .primary').click();page.locator('.auth-tabs button').last.click()
   page.locator('input[name=name]').fill('Browser Customer');page.locator('input[name=phone]').fill('+998 91 111 22 33');page.locator('input[name=code]').fill(code)
   assert page.locator('input[name=phone]').evaluate('e=>e.checkValidity()')
   page.locator('.form .primary').click();expect(page.locator('.account-name')).to_have_text('Browser Customer')
   page.locator('.dialog-close').click();page.locator('.cart-button').click();page.locator('.cart-summary .primary').click()
   page.locator('textarea[name=note]').fill('Browser validation order');page.locator('.form .primary').click()
   expect(page.locator('.order-success h2')).to_have_text('Заказ принят')
   page.locator('.order-success .primary').click();expect(page.locator('.order-card')).to_have_count(1);page.locator('.dialog-close').click()
   page.reload(wait_until='networkidle');expect(page.locator('.cart-button b')).to_have_text('0')
   # A complete build never deletes the customer's mouse or other peripherals.
   category('mouse');page.get_by_role('button',name='В сборку Logitech G102 LIGHTSYNC',exact=True).click()
   category('build');page.get_by_role('button',name='В сборку Shohstore NEO',exact=True).click();expect(page.locator('.detail-info h1')).to_have_text('Shohstore NEO');expect(page.locator('.detail-image [data-component=cooler]')).to_have_count(1);expect(page.locator('.detail-image [data-component=liquid]')).to_have_count(0);expect(page.locator('.cart-button b')).to_have_text('2')
   category('cpu');page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='В сборку AMD Ryzen 7 7800X3D',exact=True).click()
   page.locator('.cart-button').click();expect(page.locator('.cart-items')).to_contain_text('Logitech G102 LIGHTSYNC');expect(page.locator('.cart-items')).not_to_contain_text('Shohstore NEO');page.locator('.dialog-close').click()
   page.locator('.account-button').click();page.locator('.account-links button').filter(has_text='Выйти').click()
   page.locator('.account-button').click();page.locator('input[name=identifier]').fill('Browser Admin');page.locator('input[name=code]').fill(code);page.locator('.form .primary').click()
   page.locator('.account-links button').filter(has_text='Управление магазином').click();expect(page).to_have_url('http://127.0.0.1:3198/admin')
   page.locator('.section-heading .primary').click();page.locator('input[name=name]').fill('Browser Test Mouse');page.locator('select[name=category]').select_option('mouse')
   page.locator('input[name=price]').fill('450000');page.locator('input[name=oldPrice]').fill('550000');page.locator('select[name=badge]').select_option('new');page.locator('input[name=stock]').fill('3')
   for language,desc in [('ru','Оптическая мышь с датчиком, настройкой DPI и USB-подключением.'),('uz','DPI sozlanadigan USB optik sichqoncha.'),('en','Optical USB mouse with adjustable DPI.')]:page.locator(f'textarea[name=desc-{language}]').fill(desc)
   page.locator('textarea[name=specs]').fill('Sensor: Optical\nMaximum DPI: 8000\nConnection: USB\nButtons: 6\nPolling rate: 1000 Hz\nWeight: 80 g\nLighting: No\nOrientation: Right-handed\nColor: Black')
   page.locator('.admin-form .primary').click();row=page.locator('.admin-products article').filter(has_text='Browser Test Mouse');expect(row).to_have_count(1)
   page.locator('.header .logo').click();category('mouse',7);expect(page.locator('.catalog-grid .product-card')).to_have_count(7)
   page.locator('.product-card').filter(has_text='Browser Test Mouse').locator('.product-name').click();expect(page.locator('.detail-info h1')).to_have_text('Browser Test Mouse');expect(page.locator('.specs-section dl>div')).to_have_count(9);expect(page.locator('.detail-price s')).to_contain_text('550\xa0000')
   page.locator('.account-button').click();page.locator('.account-links button').filter(has_text='Управление магазином').click()
   row=page.locator('.admin-products article').filter(has_text='Browser Test Mouse');row.locator('.secondary').click();page.locator('input[name=price]').fill('390000');page.locator('.admin-form .primary').click();expect(row.locator('strong')).to_contain_text('390\xa0000')
   page.once('dialog',lambda d:d.accept());row.locator('.icon-button').click();expect(row).to_have_count(0)
   page.locator('.header .logo').click();expect(page.locator('.hero h1')).to_be_visible();page.locator('.theme-button').click();stable();page.screenshot(path=str(OUT/'dark.png'),full_page=True)
   for language,text in [('en','Big ideas.'),('uz','Katta g‘oyalar.'),('ru','Большие идеи.')]:page.locator('.language-control select').select_option(language);expect(page.locator('.hero h1')).to_contain_text(text)
   page.reload(wait_until='networkidle');expect(page.locator('html')).to_have_attribute('data-theme','dark');page.locator('.theme-button').click()
   for route in ['/','/catalog?category=keyboard','/product/ryzen-7-7800x3d']:
    page.goto('http://127.0.0.1:3198'+route,wait_until='networkidle')
    for width in [320,390,768,1440]:
     page.set_viewport_size({'width':width,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(route,width)
   page.set_viewport_size({'width':390,'height':844});page.goto('http://127.0.0.1:3198/catalog?category=keyboard',wait_until='networkidle')
   assert float(page.locator('.product-name').first.evaluate('e=>getComputedStyle(e).fontSize').replace('px',''))>=14
   page.screenshot(path=str(OUT/'mobile-catalog.png'),full_page=True);page.locator('.catalog-mobile-select select').select_option('psu');expect(page.locator('.catalog-grid .product-card')).to_have_count(6)
   reduced=browser.new_context(reduced_motion='reduce');rp=reduced.new_page();rp.goto('http://127.0.0.1:3198',wait_until='networkidle');rp.locator('.catalog-button').click();expect(rp.locator('.catalog-page')).to_be_visible();assert float(rp.locator('.page-shell').evaluate('e=>getComputedStyle(e).transitionDuration').split(',')[0].removesuffix('s'))<=.001;reduced.close()
   assert not errors,errors
   browser.close()
   print('PASS: home promotions, separate catalog, 14 categories × 6 products, persistent search, specs, peripheral/build cart behavior, SQLite signup and checkout, admin mouse CRUD and discounts, typography, themes, languages, responsive pages and reduced motion; no browser errors.')
 finally:
  server.terminate();server.wait(timeout=5);log.close()
