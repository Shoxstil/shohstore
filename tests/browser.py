"""Optional end-to-end checks. Requires Python Playwright and Chromium.
Run npm run build first. Uses a temporary database and never changes store data.
"""
import os
import secrets
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)

with tempfile.TemporaryDirectory(prefix='shohstore-browser-') as tmp:
    code = secrets.token_urlsafe(18)
    env = {**os.environ, 'SHOHSTORE_DB': str(Path(tmp)/'store.sqlite'), 'PORT': '3198',
           'SHOHSTORE_ADMIN_NAME': 'Browser Admin', 'SHOHSTORE_ADMIN_CODE': code}
    subprocess.run(['node', 'server/admin.mjs'], cwd=ROOT, env=env, check=True, capture_output=True)
    log = open(Path(tmp)/'server.log', 'w+')
    server = subprocess.Popen(['node', 'server/index.mjs'], cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        for attempt in range(60):
            try:
                urllib.request.urlopen('http://127.0.0.1:3198/api/health', timeout=1)
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError('Server did not become ready')
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width':1440,'height':1000})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.goto('http://127.0.0.1:3198', wait_until='networkidle')
            expect(page.locator('.product-card')).to_have_count(4)
            page.screenshot(path=str(OUT/'desktop.png'), full_page=True)

            # Search, empty results and sorting.
            page.locator('.search input').fill('Core i5')
            expect(page.locator('.product-card')).to_have_count(1)
            expect(page.locator('.product-name')).to_have_text('Intel Core i5-14600KF')
            page.locator('.search input').fill('no-such-component')
            expect(page.locator('.empty-area h3')).to_have_text('Ничего не нашли')
            page.locator('.search input').fill('')
            page.locator('.sort-select select').select_option('asc')
            expect(page.locator('.product-name').first).to_have_text('DeepCool AK400 Digital')
            page.locator('.sort-select select').select_option('featured')

            # Catalog and real product routes.
            page.locator('.catalog-button').click()
            page.locator('.catalog-dropdown button').filter(has_text='Материнские платы Intel').click()
            expect(page.locator('.product-card')).to_have_count(1)
            expect(page.locator('.product-name')).to_have_text('MSI PRO B760-P WIFI')
            page.locator('.all-components').click()
            page.get_by_role('button',name='В сборку AMD Ryzen 7 7800X3D',exact=True).click()
            expect(page).to_have_url('http://127.0.0.1:3198/product/ryzen-7-7800x3d')
            expect(page.locator('.detail-info h1')).to_have_text('AMD Ryzen 7 7800X3D')
            expect(page.locator('dt').filter(has_text='Количество ядер')).to_be_visible()
            page.locator('.back-link').click()
            page.locator('.product-card').filter(has_text='ASUS TUF Gaming B650-PLUS').locator('.add-button').click()
            page.locator('.cart-button').click()
            expect(page.locator('.cart-slots .filled')).to_have_count(2)
            expect(page.locator('.compatibility.good')).to_be_visible()
            expect(page.locator('.cart-summary strong')).to_contain_text('7 580 000'.replace(' ','\xa0'))
            first_qty = page.locator('.cart-item').first.locator('.quantity')
            first_qty.locator('button').last.click()
            expect(page.locator('.cart-summary strong')).to_contain_text('12 370 000'.replace(' ','\xa0'))
            first_qty.locator('button').first.click()
            page.locator('.dialog-close').click()
            page.reload(wait_until='networkidle')
            expect(page.locator('.cart-button b')).to_have_text('2')

            # Registration through the browser, then a complete persisted order.
            page.locator('.cart-button').click()
            page.locator('.cart-summary .primary').click()
            page.locator('.auth-tabs button').last.click()
            page.locator('input[name=name]').fill('Browser Customer')
            page.locator('input[name=phone]').fill('+998 91 111 22 33')
            page.locator('input[name=code]').fill(code)
            assert page.locator('input[name=phone]').evaluate('(el)=>el.checkValidity()')
            page.locator('.form .primary').click()
            expect(page.locator('.account-name')).to_have_text('Browser Customer')
            page.locator('.dialog-close').click()
            page.locator('.cart-button').click()
            page.locator('.cart-summary .primary').click()
            page.locator('textarea[name=note]').fill('Browser validation order')
            page.locator('.form .primary').click()
            expect(page.locator('.order-success h2')).to_have_text('Заказ принят')
            expect(page.locator('.order-success > strong')).to_contain_text('SH-')
            page.locator('.order-success .primary').click()
            expect(page.locator('.order-card')).to_have_count(1)
            page.locator('.dialog-close').click()
            page.reload(wait_until='networkidle')
            expect(page.locator('.cart-button b')).to_have_text('0')
            expect(page.locator('.account-button span')).to_have_text('Browser Customer')

            # Admin product create, edit, delete via protected UI.
            page.locator('.account-button').click()
            page.locator('.account-links button').filter(has_text='Выйти').click()
            page.locator('.account-button').click()
            page.locator('input[name=identifier]').fill('Browser Admin')
            page.locator('input[name=code]').fill(code)
            page.locator('.form .primary').click()
            page.locator('.account-links button').filter(has_text='Управление магазином').click()
            expect(page).to_have_url('http://127.0.0.1:3198/admin')
            page.locator('.section-heading .primary').click()
            page.locator('input[name=name]').fill('Browser Test SSD')
            page.locator('select[name=category]').select_option('ssd')
            page.locator('input[name=price]').fill('990000')
            page.locator('input[name=stock]').fill('3')
            for lang, desc in [('ru','Описание SSD'),('uz','SSD tavsifi'),('en','SSD description')]:
                page.locator(f'textarea[name=desc-{lang}]').fill(desc)
            page.locator('textarea[name=specs]').fill('Capacity: 1 TB\nInterface: NVMe')
            page.locator('.admin-form .primary').click()
            row = page.locator('.admin-products article').filter(has_text='Browser Test SSD')
            expect(row).to_have_count(1)
            row.locator('.secondary').click()
            page.locator('input[name=price]').fill('890000')
            page.locator('.admin-form .primary').click()
            expect(row.locator('strong')).to_contain_text('890\xa0000')
            page.once('dialog',lambda d:d.accept())
            row.locator('.icon-button').click()
            expect(row).to_have_count(0)
            page.locator('.header .logo').click()

            # Theme and all three languages persist across reloads.
            page.locator('.theme-button').click()
            expect(page.locator('html')).to_have_attribute('data-theme','dark')
            page.screenshot(path=str(OUT/'dark.png'),full_page=True)
            page.locator('.language-control select').select_option('en')
            expect(page.locator('h1')).to_contain_text('Big ideas.')
            page.reload(wait_until='networkidle')
            expect(page.locator('html')).to_have_attribute('lang','en')
            expect(page.locator('html')).to_have_attribute('data-theme','dark')
            page.locator('.language-control select').select_option('uz')
            expect(page.locator('h1')).to_contain_text('Katta g‘oyalar.')
            page.locator('.theme-button').click()

            # Responsive layout, native phone pattern and mobile navigation.
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':844})
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'), f'Horizontal overflow at {width}'
            page.set_viewport_size({'width':390,'height':844})
            page.locator('.language-control select').select_option('ru')
            page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
            page.locator('.mobile-menu-button').click()
            page.locator('.mobile-nav button').filter(has_text='Блоки питания').click()
            expect(page.locator('.product-card')).to_have_count(1)
            expect(page.locator('.product-name')).to_have_text('Corsair RM750e 750W')
            assert not errors, errors
            browser.close()
            print('PASS: search, categories, product routes, PC visualization, totals, cart persistence, registration, checkout, orders, admin CRUD, themes, 3 languages, 4 viewport widths. No browser errors.')
    finally:
        server.terminate()
        server.wait(timeout=5)
        log.close()
