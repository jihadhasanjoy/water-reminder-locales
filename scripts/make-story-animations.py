# Generates the Insights story animations, one short loop per story that
# shows what the story is about:
#   stories/animations/<id>.json
#   python3 scripts/make-story-animations.py
#
# 800x480 (the same shape as the story pictures), 4 s loops at 30 fps, flat
# water-blue style. The app plays them in place of the picture and falls
# back to the picture if one can't load. Edit a scene here, run the script,
# then `node scripts/build-manifest.mjs`.
import json
import os

FR, OP, W, H = 30, 120, 800, 480

OUT = os.path.join(os.path.dirname(__file__), '..', 'stories', 'animations')


def rgb(hex_color):
    h = hex_color.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1]


DEEP = rgb('#1565C0')
WATER = rgb('#1E88E5')
MID = rgb('#64B5F6')
AQUA = rgb('#A7E3FA')
PALE = rgb('#E3F2FD')
WHITE = rgb('#FFFFFF')
SUN = rgb('#F5C451')
SUN_DEEP = rgb('#E09B1A')
MOON = rgb('#FFF3C4')
NIGHT = rgb('#0D2A4A')
NIGHT_2 = rgb('#2B5A8A')
CREAM = rgb('#FFF6DD')
WARM = rgb('#FFF4E5')
TOAST = rgb('#FBBC04')
TOAST_IN = rgb('#FCE8B2')
RED = rgb('#F28B82')
GREEN = rgb('#81C995')
KIDNEY = rgb('#E57373')
WARN = rgb('#E09B1A')

EASES = {
    'linear': (0.33, 0.33, 0.67, 0.67),
    'inout': (0.45, 0.0, 0.55, 1.0),
    'out': (0.1, 0.5, 0.45, 1.0),
}


def static(v):
    return {'a': 0, 'k': v}


def anim(keys, ease='inout'):
    """keys: [(frame, value)], value a number or list. Loops if first == last."""
    out = []
    ox, oy, ix, iy = EASES[ease]
    for i, (t, v) in enumerate(keys):
        s = v if isinstance(v, list) else [v]
        kf = {'t': t, 's': s}
        if i < len(keys) - 1:
            n = len(s)
            kf['o'] = {'x': [ox] * n, 'y': [oy] * n}
            kf['i'] = {'x': [ix] * n, 'y': [iy] * n}
        out.append(kf)
    return {'a': 1, 'k': out}


def tr(p=(0, 0), a=None, s=None, r=None, o=None):
    """Group transform. p/a are points; s, r, o static values or anim()."""
    a = a if a is not None else (p if not isinstance(p, dict) else (0, 0))
    return {
        'ty': 'tr',
        'p': p if isinstance(p, dict) else static(list(p)),
        'a': static(list(a)),
        's': s if isinstance(s, dict) else static(s or [100, 100]),
        'r': r if isinstance(r, dict) else static(r or 0),
        'o': o if isinstance(o, dict) else static(100 if o is None else o),
        'sk': static(0),
        'sa': static(0),
    }


def fill(color, opacity=100):
    return {'ty': 'fl', 'c': static(color), 'o': static(opacity), 'r': 1, 'bm': 0}


def stroke(color, width, opacity=100):
    return {
        'ty': 'st', 'c': static(color), 'o': static(opacity), 'w': static(width),
        'lc': 2, 'lj': 2, 'bm': 0,
    }


def ellipse(cx, cy, w, h):
    return {'ty': 'el', 'p': static([cx, cy]), 's': static([w, h]), 'd': 1}


def rect(cx, cy, w, h, radius=0):
    return {'ty': 'rc', 'p': static([cx, cy]), 's': static([w, h]), 'r': static(radius), 'd': 1}


def path(points, closed=True, tangents=None):
    """points: [(x, y)]; tangents: [((ix, iy), (ox, oy))] relative, or None
    for straight segments."""
    n = len(points)
    tangents = tangents or [((0, 0), (0, 0))] * n
    return {
        'ty': 'sh',
        'ks': static({
            'c': closed,
            'v': [list(p) for p in points],
            'i': [list(t[0]) for t in tangents],
            'o': [list(t[1]) for t in tangents],
        }),
    }


def group(items, transform=None, name='Group'):
    return {'ty': 'gr', 'nm': name, 'it': items + [transform or tr()]}


def loop(*keys, ease='inout'):
    """A value that returns to where it started at the end of the loop."""
    return anim(list(keys) + [(OP, keys[0][1])], ease)


# Building blocks ---------------------------------------------------------

def background(color):
    return group([rect(W / 2, H / 2, W, H), fill(color)], name='Background')


def waves(front=MID, back=AQUA, opacity=55):
    """Two waves along the bottom, drifting sideways. Each wave repeats
    every 200 px and moves exactly that far per loop, so it never jumps."""
    def wave(y, amp, color, shift):
        pts, tan = [], []
        for i in range(13):
            x = -200 + i * 100
            pts.append((x, y + (amp if i % 2 else -amp)))
            tan.append(((-33, 0), (33, 0)))
        pts += [(1000, H + 10), (-200, H + 10)]
        tan += [((0, 0), (0, 0))] * 2
        move = anim([(0, [0, 0]), (OP, [shift, 0])], 'linear')
        return group([path(pts, tangents=tan), fill(color, opacity)], tr(p=move, a=(0, 0)), 'Wave')
    return [wave(436, 10, front, -200), wave(408, 12, back, 200)]


def drop_shape(cx, top, width, height):
    """A water drop: pointed top, round bottom."""
    hw = width / 2
    bottom = top + height
    mid = top + height * 0.62
    k = hw * 0.55
    return path(
        [(cx, top), (cx + hw, mid), (cx, bottom), (cx - hw, mid)],
        tangents=[
            ((-hw * 0.35, height * 0.3), (hw * 0.35, height * 0.3)),
            ((0, -height * 0.18), (0, k)),
            ((k, 0), (-k, 0)),
            ((0, k), (0, -height * 0.18)),
        ],
    )


def drop(cx, top, width, height, color=WATER, shine=True):
    items = []
    if shine:
        sx, sy = cx - width * 0.22, top + height * 0.62
        items.append(group([
            path([(sx, sy), (sx + width * 0.12, sy + height * 0.2)], closed=False,
                 tangents=[((0, 0), (0, height * 0.12)), ((-width * 0.08, 0), (0, 0))]),
            stroke(WHITE, max(4, width * 0.07), 85),
        ], name='Shine'))
    items.append(group([drop_shape(cx, top, width, height), fill(color)], name='Drop'))
    return items


def glass(cx, bottom, w, h, levels):
    """A straight glass whose water rises and falls through `levels`
    ([(frame, percent full)], looping)."""
    top = bottom - h
    level = anim([(t, [100, v]) for t, v in levels])
    return group([
        group([path([(cx - w / 2 + 14, top + 16), (cx - w / 2 + 14, bottom - 18)], closed=False),
               stroke(WHITE, 8, 70)], name='Glint'),
        group([rect(cx, top + h / 2, w, h, 14), stroke(WHITE, 7)], name='Rim'),
        group([rect(cx, bottom - (h - 10) / 2 - 5, w - 14, h - 10, 10), fill(WATER)],
              tr(p=(cx, bottom - 5), a=(cx, bottom - 5), s=level), 'Water'),
        group([rect(cx, top + h / 2, w, h, 14), fill(WHITE, 55)], name='Body'),
    ], name='Glass')


def sparkle(x, y, r, delay):
    """A four-point star that twinkles once per loop."""
    star = path(
        [(x, y - r), (x + r * 0.28, y - r * 0.28), (x + r, y), (x + r * 0.28, y + r * 0.28),
         (x, y + r), (x - r * 0.28, y + r * 0.28), (x - r, y), (x - r * 0.28, y - r * 0.28)],
    )
    d = delay % OP
    keys = sorted({0: [0, 0], d: [0, 0], min(d + 15, OP - 10): [110, 110],
                   min(d + 30, OP - 5): [0, 0]}.items())
    if keys[-1][0] != OP:
        keys.append((OP, [0, 0]))
    return group([star, fill(WHITE, 95)], tr(p=(x, y), a=(x, y), s=anim(keys, 'out')), 'Sparkle')


def falling_drop(x, y_from, y_to, size, start, length=50):
    """A small drop that falls and fades, once per loop from `start`."""
    end = min(start + length, OP - 1)
    pos = anim([(0, [x, y_from]), (start, [x, y_from]), (end, [x, y_to]), (OP, [x, y_to])], 'linear')
    fade = anim([(0, 0), (start, 0), (start + 8, 100), (end - 6, 100), (end, 0), (OP, 0)], 'linear')
    return group(drop(0, -size * 0.6, size * 0.66, size, WATER, shine=False),
                 tr(p=pos, a=(0, 0), o=fade), 'Falling drop')


def plate(cx, cy, foods):
    return group(foods + [
        group([ellipse(cx, cy - 10, 168, 40), fill(PALE)], name='Rim inner'),
        group([ellipse(cx, cy - 8, 236, 64), fill(WHITE)], name='Plate'),
        group([ellipse(cx, cy, 240, 68), fill(DEEP, 12)], name='Shadow'),
    ], name='Plate')


def save(name, shapes):
    data = {
        'v': '5.7.4', 'fr': FR, 'ip': 0, 'op': OP, 'w': W, 'h': H,
        'nm': f'Story {name}', 'ddd': 0, 'assets': [],
        'layers': [{
            'ddd': 0, 'ind': 1, 'ty': 4, 'nm': name, 'sr': 1,
            'ks': {'a': static([0, 0, 0]), 'p': static([0, 0, 0]),
                   's': static([100, 100, 100]), 'r': static(0), 'o': static(100)},
            'shapes': shapes, 'ip': 0, 'op': OP, 'st': 0, 'bm': 0,
        }],
    }
    os.makedirs(OUT, exist_ok=True)
    file = os.path.join(OUT, f'{name}.json')
    with open(file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'stories/animations/{name}.json ({os.path.getsize(file) // 1024} KB)')


# Scenes (first shape draws on top) ---------------------------------------

def kidney(cx, cy, flip, beat):
    """A kidney bean: an oval with a bite out of its inner side."""
    side = -1 if flip else 1
    return group([
        group([path([(cx - 30 * side, cy - 50), (cx - 40 * side, cy + 40)], closed=False,
                    tangents=[((0, 0), (-25 * side, 30)), ((-10 * side, -30), (0, 0))]),
               stroke(WHITE, 10, 50)], name='Shine'),
        group([ellipse(cx + 62 * side, cy, 70, 90), fill(PALE)], name='Bite'),
        group([ellipse(cx, cy, 150, 230), fill(KIDNEY)], name='Bean'),
    ], tr(p=(cx, cy), a=(cx, cy), s=beat), 'Kidney')


# Kidneys: drops fall steadily into two kidneys that pulse gently, a sign
# of them working well with regular water.
beat = loop((0, [100, 100]), (30, [104, 104]), (60, [100, 100]), (90, [104, 104]))
save('kidneys', [
    sparkle(400, 90, 16, 10), sparkle(170, 110, 10, 50), sparkle(640, 120, 12, 85),
    falling_drop(400, 40, 230, 46, 0), falling_drop(400, 40, 230, 46, 40),
    falling_drop(400, 40, 230, 46, 80),
    group([path([(330, 320), (400, 350), (470, 320)], closed=False,
                tangents=[((0, 0), (30, 25)), ((-35, 0), (35, 0)), ((-30, 25), (0, 0))]),
           stroke(WATER, 9, 70)], name='Flow'),
    kidney(250, 240, False, beat), kidney(550, 240, True, beat),
    *waves(), background(PALE),
])

# Why water: a drop bounces next to a glass that keeps filling up.
bounce = loop((0, [300, 390]), (30, [300, 366]), (60, [300, 390]), (90, [300, 366]))
squash = loop((0, [100, 100]), (28, [96, 104]), (58, [106, 94]), (62, [100, 100]),
              (88, [96, 104]))
save('why-water', [
    sparkle(160, 110, 14, 0), sparkle(430, 90, 10, 40), sparkle(670, 130, 14, 80),
    group(drop(0, -260, 190, 250), tr(p=bounce, a=(0, 0), s=squash), 'Bouncing drop'),
    glass(540, 390, 150, 220, [(0, 30), (60, 85), (120, 30)]),
    *waves(), background(PALE),
])

# Morning glass: the sun rises behind a glass that fills up first thing.
rays = [group([rect(560, 80, 12, 36, 6), fill(SUN_DEEP, 60)],
              tr(p=(560, 250), a=(560, 250), r=a), 'Ray') for a in range(0, 360, 30)]
save('morning-glass', [
    sparkle(180, 140, 12, 20), sparkle(430, 110, 10, 70),
    glass(300, 400, 160, 240, [(0, 15), (70, 90), (100, 90), (120, 15)]),
    *waves(),
    group([
        group([ellipse(560, 250, 220, 220), fill(SUN)], name='Sun'),
        group([ellipse(560, 250, 300, 300), fill(SUN, 25)], name='Glow'),
        *rays,
    ], tr(p=loop((0, [560, 290]), (60, [560, 250])), a=(560, 250),
          r=anim([(0, 0), (OP, 30)], 'linear')), 'Sunrise'),
    background(CREAM),
])

# Breakfast: steam rises from a plate of toast and egg; a glass beside it.
def steam(x, delay):
    rise = anim([(0, [0, 0]), (delay, [0, 0]), (delay + 60, [0, -70]), (OP, [0, -70])], 'linear')
    fade = anim([(0, 0), (delay, 0), (delay + 15, 70), (delay + 50, 0), (OP, 0)], 'linear')
    wisp = path([(x, 290), (x, 240)], closed=False,
                tangents=[((0, 0), (16, -16)), ((-16, 16), (0, 0))])
    return group([wisp, stroke(MID, 7)], tr(p=rise, a=(0, 0), o=fade), 'Steam')


save('breakfast', [
    steam(300, 0), steam(340, 30), steam(380, 60),
    plate(330, 360, [
        group([ellipse(384, 333, 30, 30), fill(SUN)], name='Yolk'),
        group([ellipse(380, 335, 92, 52), fill(WHITE), stroke(PALE, 3)], name='Egg'),
        group([rect(290, 329, 64, 42, 10), fill(TOAST_IN)], name='Toast inside'),
        group([rect(290, 329, 80, 58, 14), fill(TOAST, 85)], name='Toast'),
    ]),
    glass(580, 390, 130, 210, [(0, 40), (60, 80), (120, 40)]),
    group([ellipse(140, 110, 84, 84), fill(SUN, 90)],
          tr(p=(140, 110), s=loop((0, [100, 100]), (60, [108, 108]))), 'Sun'),
    *waves(), background(rgb('#FFF8E8')),
])

# Lunch: the clock goes round, the bowl waits and the glass is topped up.
save('lunch', [
    group([
        group([ellipse(650, 150, 14, 14), fill(DEEP)], name='Pin'),
        group([rect(650, 125, 8, 50, 4), fill(DEEP)],
              tr(p=(650, 150), a=(650, 150), r=anim([(0, 0), (OP, 360)], 'linear')), 'Minute hand'),
        group([rect(650, 136, 8, 30, 4), fill(DEEP)],
              tr(p=(650, 150), a=(650, 150), r=anim([(0, 30), (OP, 60)], 'linear')), 'Hour hand'),
        group([ellipse(650, 150, 128, 128), fill(WHITE), stroke(WATER, 8)], name='Face'),
    ], name='Clock'),
    plate(300, 370, [
        group([ellipse(337, 336, 36, 36), fill(GREEN)], name='Pea'),
        group([ellipse(300, 328, 44, 44), fill(RED)], name='Tomato'),
        group([ellipse(265, 335, 40, 40), fill(GREEN)], name='Leaf'),
        group([path([(215, 340), (385, 340)],
                    tangents=[((0, 0), (40, 60)), ((-40, 60), (0, 0))]),
               fill(WHITE), stroke(MID, 4)], name='Bowl'),
    ]),
    glass(540, 390, 140, 210, [(0, 25), (50, 25), (80, 75), (120, 25)]),
    *waves(), background(rgb('#E8F6FD')),
])

# Evening: stars twinkle over a half glass on the bedside table; a few
# sleepy Z's drift up.
def zed(x, y, size, delay):
    rise = anim([(0, [0, 0]), (delay, [0, 0]), (delay + 70, [20, -80]), (OP, [20, -80])], 'linear')
    fade = anim([(0, 0), (delay, 0), (delay + 12, 90), (delay + 60, 0), (OP, 0)], 'linear')
    z = path([(x, y), (x + size, y), (x, y + size), (x + size, y + size)], closed=False)
    return group([z, stroke(MOON, size * 0.18)], tr(p=rise, a=(0, 0), o=fade), 'Z')


save('evening', [
    zed(520, 250, 28, 0), zed(540, 230, 20, 35), zed(560, 210, 16, 70),
    glass(400, 380, 120, 180, [(0, 45), (60, 50), (120, 45)]),
    group([rect(190, 440, 20, 76), fill(NIGHT_2)], name='Leg'),
    group([rect(610, 440, 20, 76), fill(NIGHT_2)], name='Leg'),
    group([rect(400, 393, 480, 26, 10), fill(NIGHT_2)], name='Table'),
    group([
        group([ellipse(628, 112, 112, 112), fill(NIGHT)], name='Shadow'),
        group([ellipse(600, 130, 124, 124), fill(MOON)], name='Moon'),
    ], tr(p=(600, 130), s=loop((0, [100, 100]), (60, [104, 104]))), 'Moon'),
    sparkle(150, 90, 9, 0), sparkle(260, 160, 6, 30), sparkle(470, 70, 8, 60),
    sparkle(720, 230, 7, 90), sparkle(380, 140, 5, 45),
    background(NIGHT),
])

# Signs: in the heat, a drop shrinks and a warning blinks.
heat = [group([path([(560 + i * 40, 160), (560 + i * 40, 76)], closed=False,
                    tangents=[((0, 0), (12, -14)), ((-12, 14), (0, 0))]),
               stroke(SUN_DEEP, 7, 55)],
              tr(p=loop((0, [0, 0]), (60, [0, -12])), a=(0, 0)), 'Heat') for i in range(3)]
save('signs', [
    group([
        group([ellipse(500, 320, 14, 14), fill(WHITE)], name='Dot'),
        group([rect(500, 286, 12, 34, 6), fill(WHITE)], name='Bar'),
        group([ellipse(500, 300, 92, 92), fill(WARN)], name='Badge'),
    ], tr(p=(500, 300), o=loop((0, 100), (20, 100), (30, 30), (40, 100), (60, 100),
                                  (70, 30), (80, 100), ease='linear')), 'Warning'),
    group(drop(380, 134, 168, 222),
          tr(p=(380, 356), a=(380, 356), s=loop((0, [100, 100]), (60, [80, 80]))), 'Shrinking drop'),
    *heat,
    group([ellipse(160, 120, 112, 112), fill(SUN, 90)],
          tr(p=(160, 120), s=loop((0, [100, 100]), (60, [110, 110]))), 'Sun'),
    *waves(), background(WARM),
])
