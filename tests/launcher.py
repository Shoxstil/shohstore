"""Exercise a fresh download, automatic setup, restart and SQLite persistence."""
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

with tempfile.TemporaryDirectory(prefix='Shohstore download с пробелами ') as tmp:
    shop = Path(tmp)/'shohstore-main'
    shutil.copytree(ROOT, shop, ignore=shutil.ignore_patterns('.git','node_modules','dist','data','test-results','__pycache__'))
    assert not (shop/'node_modules').exists()
    assert not (shop/'dist').exists()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    url=f'http://127.0.0.1:{port}'
    code=secrets.token_urlsafe(18)
    env={**os.environ,'PORT':str(port),'SHOHSTORE_NO_OPEN':'1','SHOHSTORE_ADMIN_NAME':'Launcher Admin','SHOHSTORE_ADMIN_CODE':code}
    if 'NPM_CONFIG_CACHE' not in env:
        env['NPM_CONFIG_CACHE']='/tmp/shohstore-npm-cache'
    env.pop('SHOHSTORE_DB',None)
    env.pop('NODE_ENV',None)
    def request(path,body=None,cookie=None):
        data=None if body is None else json.dumps(body).encode()
        headers={} if body is None else {'Content-Type':'application/json'}
        if cookie: headers['Cookie']=cookie
        response=urllib.request.urlopen(urllib.request.Request(url+path,data=data,headers=headers),timeout=10)
        return response,json.load(response)
    def start(log_path):
        log=open(log_path,'w')
        proc=subprocess.Popen(['sh','./START-SHOHSTORE.sh'],cwd=shop,env=env,stdout=log,stderr=log,start_new_session=True)
        for _ in range(300):
            if proc.poll() is not None:
                log.close()
                raise RuntimeError('Launcher exited: '+log_path.read_text()[-4000:])
            try:
                _,health=request('/api/health')
                if health.get('ok'):
                    return proc,log
            except Exception:
                pass
            time.sleep(.2)
        os.killpg(proc.pid,signal.SIGTERM)
        proc.wait(timeout=10)
        log.close()
        raise RuntimeError('Launcher timed out: '+log_path.read_text()[-4000:])
    def stop(proc,log):
        os.killpg(proc.pid,signal.SIGTERM)
        proc.wait(timeout=10)
        log.close()

    log1=Path(tmp)/'first-launch.log'
    proc,log=start(log1)
    try:
        _,catalog=request('/api/products')
        assert len(catalog['products'])==84
        response=urllib.request.urlopen(url,timeout=10)
        html=response.read().decode()
        assert '/assets/frontend-' in html and '__SHOHSTORE_STANDALONE__' not in html
        assert (shop/'node_modules/.shohstore-install').exists()
        assert (shop/'dist/frontend.html').exists()
        assert (shop/'data/store.sqlite').exists()
        subprocess.run(['node','server/admin.mjs'],cwd=shop,env=env,check=True,capture_output=True)
        response,login=request('/api/auth/login',{'identifier':'Launcher Admin','code':code})
        assert login['user']['role']=='admin'
        cookie=response.headers['Set-Cookie'].split(';')[0]
        _,product=request('/api/admin/products',{'name':'Launcher persistence SSD','category':'ssd','price':1230000,'stock':2,'description':{'ru':'Тест','uz':'Sinov','en':'Test'},'specs':{'Capacity':'1 TB'}},cookie)
        product_id=product['product']['id']
    finally:
        stop(proc,log)

    log2=Path(tmp)/'second-launch.log'
    proc,log=start(log2)
    try:
        _,catalog=request('/api/products')
        assert len(catalog['products'])==85
        assert any(p['id']==product_id for p in catalog['products'])
        _,login=request('/api/auth/login',{'identifier':'Launcher Admin','code':code})
        assert login['user']['role']=='admin'
        assert 'installing dependencies' not in log2.read_text()
    finally:
        stop(proc,log)
    print('PASS: fresh extracted copy, Unicode/spaces in path, automatic npm installation and build, HTTP frontend/API, administrator creation, protected product write, restart without reinstall, database persistence.')
