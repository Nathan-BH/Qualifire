import json, os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
SP='/tmp/claude-0/-home-claude/90e61ead-c1a5-54bb-a05e-46a65bfa97a1/scratchpad'
src=open(SP+'/tl/teaser-lanes.html').read()
muts=[m for m in json.load(open('muts.json')) if m[1]!=m[2]]
def one(i_m):
    i,(name,a,b)=i_m
    d=f'{SP}/mut/m{i:02d}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d+'/tests')
    open(d+'/teaser-lanes.html','w').write(src.replace(a,b,1))
    shutil.copy(SP+'/tl/teaser-lanes.test.mjs',d)
    for f in ['e2e.mjs','e2e-real.mjs','synthetic-kit.mjs']: shutil.copy(SP+'/tl/tests/'+f,d+'/tests/')
    r=subprocess.run(['node','teaser-lanes.test.mjs'],cwd=d,capture_output=True,text=True)
    unit=r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-200:]
    r2=subprocess.run(['node','tests/e2e.mjs',SP+'/synkit',d+'/o1'],cwd=d,capture_output=True,text=True,timeout=300)
    e2e=[l for l in r2.stdout.splitlines() if l.startswith('ALL PASS') or 'FAILED' in l or 'failed' in l.lower()][-1:] 
    nf=sum(1 for l in r2.stdout.splitlines() if l.startswith('FAIL'))
    r3=subprocess.run(['node','tests/e2e-real.mjs',SP+'/realkit',d+'/o2'],cwd=d,capture_output=True,text=True,timeout=300)
    nf3=sum(1 for l in r3.stdout.splitlines() if l.startswith('FAIL'))
    return f'{name:45s} | unit: {unit[:40]:40s} | e2e FAIL lines: {nf} (rc {r2.returncode}) | real FAIL lines: {nf3} (rc {r3.returncode})'
with ThreadPoolExecutor(4) as ex:
    for line in ex.map(one, enumerate(muts)): print(line, flush=True)
