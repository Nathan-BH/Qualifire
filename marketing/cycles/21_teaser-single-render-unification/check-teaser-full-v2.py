#!/usr/bin/env python3
"""Static self-check for teaser-full v2 (root + 5 sub-compositions). No browser, no npm.
Run:  python3 check-teaser-full-v2.py [repo-root]     (default repo root: $HOME/mnt/Qualifire)
Exit code 0 = every check passed. Any FAIL line = fix or STOP per the brief."""
import os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/mnt/Qualifire')
SS = os.path.join(ROOT, 'marketing', 'silent-studio')
TF = os.path.join(SS, 'teaser-full')

SCENES = [  # cid, source file, root-absolute start, duration, slot track, byId count, has basemap
    ('opening',     'brandmark/opening/index.html', '0',    '6.2',  0, 0, False),
    ('startride',   'start-ride/index.html',        '6.2',  '14.0', 1, 5, True),
    ('gatessaving', 'gates-saving/index.html',      '20.2', '12.3', 2, 5, True),
    ('ranking',     'ranking/index.html',           '32.5', '10.8', 3, 5, True),
    ('closing',     'brandmark/closing/index.html', '43.3', '4.0',  4, 0, False),
]
fails = 0
def ok(cond, msg):
    global fails
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails += 1

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def inline_script(html):
    """Body of the last inline <script> (no src=) in an HTML string."""
    bodies = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
    return bodies[-1] if bodies else None

def norm(body):
    return '\n'.join(l.strip() for l in body.splitlines() if l.strip())

def css_rules(style_text):
    txt = re.sub(r'/\*.*?\*/', '', style_text, flags=re.S)
    out = []
    for chunk in txt.split('}'):
        if '{' not in chunk: continue
        sel = chunk.split('{', 1)[0].strip()
        if sel: out.append(sel)
    return out

# ---------- root ----------
root = read(os.path.join(TF, 'index.html'))
ok(re.search(r'\.add\(\s*\w', root) is None and 'gsap.context' not in root, 'root: no timeline .add(child) / gsap.context')
ok(re.search(r'<div id="stage" data-composition-id="teaser" data-start="0" data-duration="47.3" data-width="1920" data-height="1080">', root) is not None, 'root: #stage composition div attrs')
ok('window.__timelines.teaser = gsap.timeline({ paused: true });' in root, 'root: empty paused root timeline registered as teaser')
ok(':root {' in root and ':root[data-theme="day"] {' in root, 'root: both :root token blocks present')
ok('<html lang="en" data-theme="night">' in root and '<script src="theme.js"></script>' in root, 'root: data-theme=night + theme.js')
ok(root.count('data-composition-src=') == 5, 'root: exactly 5 slots')
total = 0.0
for cid, src, start, dur, track, nbyid, hasbm in SCENES:
    pat = (r'<div id="%s-slot"\s+class="clip"\s+data-composition-id="%s"\s+data-composition-src="compositions/%s.html"\s+'
           r'data-start="%s"\s+data-duration="%s"\s+data-track-index="%d"></div>') % (cid, cid, cid, re.escape(start), re.escape(dur), track)
    ok(re.search(pat, root) is not None, 'root: slot %s start=%s dur=%s track=%d, empty' % (cid, start, dur, track))
    ok(abs(total - float(start)) < 1e-9, 'root: %s starts where the previous scene ends (%.1f)' % (cid, total))
    total += float(dur)
ok(abs(total - 47.3) < 1e-9, 'root: durations sum to 47.3 (got %.3f)' % total)
ok('data-hf-id' not in root, 'root: no data-hf-id stamps')

# ---------- sub-compositions ----------
for cid, src, start, dur, track, nbyid, hasbm in SCENES:
    path = os.path.join(TF, 'compositions', cid + '.html')
    print('--- %s' % path)
    if not os.path.exists(path):
        ok(False, '%s: file exists' % cid); continue
    comp = read(path); orig = read(os.path.join(SS, src))
    s = comp.strip()
    ok(s.startswith('<template>') and s.endswith('</template>'), '%s: wrapped in a single <template>' % cid)
    ok(comp.count('<template>') == 1, '%s: exactly one <template>' % cid)
    for bad in ['<!DOCTYPE', '<html', '<head', '<body', '<title', '<meta', '<script src=', ':root', 'data-hf-id',
                'document.getElementById', 'master.add', 'paused(false)', 'html, body']:
        ok(bad not in comp, '%s: does not contain %r' % (cid, bad))
    ok(re.search(r'<div id="%s" data-composition-id="%s" data-start="0" data-duration="%s" data-width="1920" data-height="1080" style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var\(--bg\);">' % (cid, cid, re.escape(dur)), comp) is not None,
       '%s: composition div attrs (dur %s)' % (cid, dur))
    ok(re.search(r'<div id="%s-scene" class="clip full" data-start="0" data-duration="%s" data-track-index="0">' % (cid, re.escape(dur)), comp) is not None,
       '%s: #%s-scene clip, track 0, dur %s' % (cid, cid, dur))
    # inner clips: none may sit on track 0 besides the scene div
    inner_tracks = re.findall(r'data-track-index="(\d+)"', comp)
    ok(inner_tracks.count('0') == 1, '%s: only #%s-scene is on track 0 (found %s)' % (cid, cid, inner_tracks))
    ok(all(dur == d for d in re.findall(r'data-duration="([^"]+)"', comp)), '%s: every data-duration in file == %s' % (cid, dur))
    # CSS prefixing
    styles = re.findall(r'<style>(.*?)</style>', comp, re.S)
    ok(len(styles) == 1, '%s: exactly one <style>' % cid)
    prefix = '#%s #%s-scene' % (cid, cid)
    badsel = [p.strip() for sel in css_rules(styles[0] if styles else '') for p in sel.split(',') if not p.strip().startswith(prefix)]
    ok(not badsel, '%s: every CSS selector starts with %r (offenders: %s)' % (cid, prefix, badsel[:5]))
    nrules_orig = len(css_rules(re.findall(r'<style>(.*?)</style>', orig, re.S)[0]))
    nrules_new = len(css_rules(styles[0])) if styles else 0
    ok(nrules_new == nrules_orig - 3, '%s: rule count = original minus the 3 dropped (:root, :root[day], html/body): %d vs %d' % (cid, nrules_new, nrules_orig))
    # script wrapper
    body = inline_script(comp) or ''
    ok(("document.currentScript.closest('#%s-scene')" % cid) in body and ("document.querySelector('#%s-scene')" % cid) in body, '%s: R resolves to #%s-scene' % (cid, cid))
    ok("function byId(id) { return R.querySelector('#' + id); }" in body, '%s: byId helper' % cid)
    ok('gsap.context(function () {' in body and '}, R);' in body, '%s: gsap.context(fn, R) wrapper' % cid)
    ok(body.count('byId(') == nbyid + 1, '%s: byId( occurrences = %d (+1 for the helper)' % (cid, nbyid))
    ok(body.count('window.__timelines.%s = tl;' % cid) == 1, '%s: registers window.__timelines.%s once' % (cid, cid))
    ok(len(re.findall(r'window\.__timelines\.\w+ = ', body)) == 1, '%s: registers no other timeline id' % cid)
    # basemap media id
    if hasbm:
        ok(comp.count('id="%s-basemap"' % cid) == 1 and 'id="basemap"' not in comp, '%s: img id renamed to %s-basemap' % (cid, cid))
        ok(("byId('%s-basemap').src = 'map-day.png';" % cid) in body, '%s: day-theme swap targets %s-basemap' % (cid, cid))
        ok(('%s #%s-basemap {' % (prefix, cid)) in styles[0] or ('%s #%s-basemap{' % (prefix, cid)) in styles[0], '%s: CSS rule for #%s-basemap' % (cid, cid))
        ok(comp.count('%s-basemap' % cid) == 3 and "'basemap'" not in comp and '#basemap' not in re.sub(r'/\*.*?\*/', '', styles[0], flags=re.S), '%s: exactly 3 references to %s-basemap (html id, css, js) and no bare basemap id/selector left' % (cid, cid))
    # tween fidelity: new body inside the context == original body after the permitted substitutions
    m = re.search(r'gsap\.context\(function \(\) \{\n(.*)\n\s*\}, R\);', body, re.S)
    inner = m.group(1) if m else ''
    expect = inline_script(orig).replace('document.getElementById(', 'byId(')
    if hasbm: expect = expect.replace("byId('basemap')", "byId('%s-basemap')" % cid)
    ok(norm(inner) == norm(expect), '%s: script body byte-identical to original modulo the permitted substitutions (and indentation)' % cid)
    if norm(inner) != norm(expect):
        a, b = norm(inner).splitlines(), norm(expect).splitlines()
        for i, (x, y) in enumerate(zip(a, b)):
            if x != y: print('   first diff at normalized line %d:\n   NEW: %s\n   ORIG: %s' % (i + 1, x, y)); break
        else: print('   line counts differ: new %d vs expected %d' % (len(a), len(b)))
    # markup fidelity: every element id of the original (except basemap) still present exactly as many times
    for eid in sorted(set(re.findall(r'(?<![-\w])id="([^"]+)"', orig)) - {'stage', 'basemap'}):
        cnt = lambda t: len(re.findall(r'(?<![-\w])id="%s"' % re.escape(eid), t))
        ok(cnt(comp) == cnt(orig), '%s: id=%s count preserved' % (cid, eid))

print('\n%s' % ('ALL CHECKS PASSED' if fails == 0 else '%d CHECK(S) FAILED' % fails))
sys.exit(1 if fails else 0)
