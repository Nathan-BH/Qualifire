import re, sys, pathlib

ROOT = pathlib.Path('.')

RENAMES = [
    ('routeSpecs', 'waySpecs'),
    ('wayCreation', 'routeCreation'),
    ('wayFromRide', 'routeFromRide'),
    ('defaultRoute', 'defaultWay'),
    ('demoRouteFixture', 'demoWayFixture'),
    ('routeAssetRuntime', 'wayAssetRuntime'),
    ('routeMapGeo', 'wayMapGeo'),
    ('routeMapMath', 'wayMapMath'),
    ('routeMapStyle', 'wayMapStyle'),
    ('routeMapView', 'wayMapView'),
    ('wayNamingCard', 'routeNamingCard'),
    ('routeasset_runtime_suite', 'wayasset_runtime_suite'),
    ('routemapgeo_suite', 'waymapgeo_suite'),
    ('routemapstyle_suite', 'waymapstyle_suite'),
    ('routemap_suite', 'waymap_suite'),
    ('routespec_suite', 'wayspec_suite'),
    ('waycreation_suite', 'routecreation_suite'),
]

files = list(ROOT.glob('src/**/*.ts')) + list(ROOT.glob('src/**/*.tsx')) + list(ROOT.glob('tests/**/*.ts'))

changed = []
for f in files:
    text = f.read_text(encoding='utf-8')
    orig = text
    for old, new in RENAMES:
        pattern = re.compile(r"(['\"])((?:[./][\w./-]*/)?)" + re.escape(old) + r"(\.tsx?)?(\1)")
        def repl(m):
            quote, prefix, ext, endquote = m.group(1), m.group(2), m.group(3) or '', m.group(4)
            return f"{quote}{prefix}{new}{ext}{endquote}"
        text = pattern.sub(repl, text)
    text = text.replace("from './routes'", "from './ways'")
    text = text.replace("assets/routes/", "assets/ways/")
    text = text.replace("routes.json'", "ways.json'")
    if text != orig:
        f.write_text(text, encoding='utf-8')
        changed.append(str(f))

print(f"{len(changed)} files changed:")
for c in changed:
    print(" ", c)
