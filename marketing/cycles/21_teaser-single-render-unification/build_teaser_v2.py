#!/usr/bin/env python3
import os, re, sys

ROOT = os.path.expanduser('~/mnt/Qualifire')
SS = os.path.join(ROOT, 'marketing', 'silent-studio')
TF = os.path.join(SS, 'teaser-full')

# Updated 2026-09-26: start-ride's blank lead-in shortened 1.0s->0.2s (piano-note sync fix,
# see start-ride/index.html's own comment) shrinks its duration 14.0->13.2, cascading -0.8s
# into every later scene's start (gatessaving/ranking/closing) and the master's total duration.
SCENES = [
    ('opening',     'brandmark/opening/index.html', '0',    '6.2',  0, 0, False),
    ('startride',   'start-ride/index.html',        '6.2',  '13.2', 1, 5, True),
    ('gatessaving', 'gates-saving/index.html',      '19.4', '12.3', 2, 5, True),
    ('ranking',     'ranking/index.html',           '31.7', '10.8', 3, 5, True),
    ('closing',     'brandmark/closing/index.html', '42.5', '4.0',  4, 0, False),
]

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def write(p, s):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)

def reindent(text, add=4):
    out = []
    for line in text.split('\n'):
        if line.strip() == '':
            out.append('')
        else:
            out.append(' ' * add + line)
    return '\n'.join(out)

def trim_blank_edges(text):
    """Drop fully-blank leading/trailing LINES, but keep the indentation whitespace
    that prefixes the first/last real content line (unlike str.strip())."""
    lines = text.split('\n')
    while lines and lines[0].strip() == '':
        lines.pop(0)
    while lines and lines[-1].strip() == '':
        lines.pop()
    return '\n'.join(lines)

def tokenize_css(text):
    """Yields ('text', s) | ('comment', s) | ('rule', selector_raw, body) in order."""
    items = []
    i, n = 0, len(text)
    buf_start = 0
    while i < n:
        if text[i:i+2] == '/*':
            if i > buf_start:
                items.append(('text', text[buf_start:i]))
            end = text.index('*/', i + 2) + 2
            items.append(('comment', text[i:end]))
            i = end
            buf_start = i
            continue
        if text[i] == '{':
            selector_raw = text[buf_start:i]
            j = text.index('}', i + 1)
            body = text[i + 1:j]
            items.append(('rule', selector_raw, body))
            i = j + 1
            buf_start = i
            continue
        i += 1
    if buf_start < n:
        items.append(('text', text[buf_start:]))
    return items

DROP_SELECTORS = {':root', ':root[data-theme="day"]', 'html, body'}

def prefix_selector(sel_text, cid):
    parts = [p.strip() for p in sel_text.split(',')]
    prefix = '#%s #%s-scene' % (cid, cid)
    return ', '.join(prefix + ' ' + p for p in parts)

def transform_css(style_text, cid, hasbm):
    items = tokenize_css(style_text)
    out = []
    for it in items:
        if it[0] == 'text':
            out.append(it[1])
        elif it[0] == 'comment':
            ctext = it[1]
            if ctext.startswith('/* ---- theme tokens'):
                continue  # dropped
            out.append(ctext)
        else:  # rule
            _, selector_raw, body = it
            leading_ws_match = re.match(r'^(\s*)(.*)$', selector_raw, re.S)
            leading_ws = leading_ws_match.group(1)
            rest = leading_ws_match.group(2)
            sel = rest.rstrip()
            trailing_ws = rest[len(sel):] or ' '
            if sel in DROP_SELECTORS:
                continue
            new_body = body
            if sel == '#stage':
                # #stage becomes the scene root's OWN rule -- selector is the bare prefix,
                # not a further descendant of it (there is no #stage element in the new file).
                new_sel = '#%s #%s-scene' % (cid, cid)
                new_body = new_body.replace('position: relative;', 'position: absolute; top: 0; left: 0;')
            else:
                new_sel = prefix_selector(sel, cid)
                if sel == '#basemap' and hasbm:
                    new_sel = re.sub(r'#basemap$', '#%s-basemap' % cid, new_sel)
            # preserve the original selector-to-brace padding (keeps same-block alignment,
            # since every selector in a block gains the same prefix length)
            out.append(leading_ws + new_sel + trailing_ws + '{' + new_body + '}')
    css = trim_blank_edges(''.join(out))
    return reindent(css, 4)

def transform_markup(stage_content, cid, dur, is_gatessaving, hasbm):
    core = re.sub(r'<script[^>]*>.*?</script>', '', stage_content, flags=re.S)
    core = trim_blank_edges(core)
    # strip data-hf-id attributes
    core = re.sub(r'\s?data-hf-id="[^"]*"', '', core)
    # bump every inner track-index by 1
    core = re.sub(r'data-track-index="(\d+)"', lambda m: 'data-track-index="%d"' % (int(m.group(1)) + 1), core)
    # gates-saving stale duration fix
    if is_gatessaving:
        core = core.replace('data-duration="12.4"', 'data-duration="12.3"')
    # basemap id rename (HTML)
    if hasbm:
        core = core.replace('id="basemap"', 'id="%s-basemap"' % cid)
    return reindent(core, 4)

def transform_script(orig_body, cid, hasbm):
    body = orig_body.replace('document.getElementById(', 'byId(')
    if hasbm:
        body = body.replace("'basemap'", "'%s-basemap'" % cid)
    return body

def build_scene(cid, src_rel, start, dur, track, nbyid, hasbm):
    orig_path = os.path.join(SS, src_rel)
    orig = read(orig_path)

    style_block = re.findall(r'<style>(.*?)</style>', orig, re.S)[0]
    css_new = transform_css(style_block, cid, hasbm)

    stage_m = re.search(r'<div[^>]*\bid="stage"[^>]*>', orig)
    stage_open_end = stage_m.end()
    last_div_close = orig.rfind('</div>', 0, orig.rfind('</body>'))
    stage_content = orig[stage_open_end:last_div_close]
    markup_new = transform_markup(stage_content, cid, dur, cid == 'gatessaving', hasbm)

    bodies = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', orig, re.S)
    orig_body = bodies[-1]
    script_body_new = transform_script(orig_body, cid, hasbm)

    comp = []
    comp.append('<template>')
    comp.append('  <div id="%s" data-composition-id="%s" data-start="0" data-duration="%s" data-width="1920" data-height="1080" style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg);">' % (cid, cid, dur))
    comp.append('    <style>')
    comp.append(css_new)
    comp.append('    </style>')
    comp.append('')
    comp.append('    <div id="%s-scene" class="clip full" data-start="0" data-duration="%s" data-track-index="0">' % (cid, dur))
    comp.append('')
    comp.append(markup_new)
    comp.append('')
    comp.append('    </div>')
    comp.append('')
    comp.append('    <script>')
    comp.append('(function () {')
    comp.append("  var R = (document.currentScript && document.currentScript.closest('#%s-scene')) || document.querySelector('#%s-scene');" % (cid, cid))
    comp.append('  if (!R || !window.gsap) return;')
    comp.append("  function byId(id) { return R.querySelector('#' + id); }")
    comp.append('  gsap.context(function () {' + script_body_new + '}, R);')
    comp.append('})();')
    comp.append('    </script>')
    comp.append('  </div>')
    comp.append('</template>')
    comp.append('')

    out_path = os.path.join(TF, 'compositions', cid + '.html')
    write(out_path, '\n'.join(comp))
    print('wrote', out_path, len('\n'.join(comp).splitlines()), 'lines')

if __name__ == '__main__':
    for s in SCENES:
        build_scene(*s)
