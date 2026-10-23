from PIL import Image, ImageDraw
import os

# Editor Board v2 launcher icon master geometry (units = 512 box)
BG      = (0x1B, 0x25, 0x36, 255)   # deep slate/ink
FRAME   = (0x8C, 0xA0, 0xB8, 255)   # subtle clip-frame outline
WHITE   = (255, 255, 255, 255)      # play triangle
AMBER   = (0xF5, 0xA5, 0x24, 255)   # editing-timeline accent bar

def draw_mark(d, S, ox, oy, sc):
    """Draw frame + triangle + amber bar. sc = px per 512-unit."""
    def X(v): return ox + v * sc
    def Y(v): return oy + v * sc
    # clip-frame outline
    d.rounded_rectangle([X(118), Y(146), X(394), Y(326)], radius=26*sc,
                       outline=FRAME, width=max(2, int(14*sc)))
    # play triangle
    d.polygon([X(232), Y(196), X(312), Y(236), X(232), Y(276)], fill=WHITE)
    # amber timeline bar
    d.rounded_rectangle([X(186), Y(296), X(326), Y(314)], radius=9*sc, fill=AMBER)

def legacy_icon(S):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S-1, S-1], radius=int(112/512*S), fill=BG)
    draw_mark(d, S, 0, 0, S/512)
    return img

def round_icon(S):
    img = legacy_icon(S)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, S-1, S-1], fill=255)
    img.putalpha(mask)
    return img

def foreground(S):
    """Adaptive foreground: transparent bg, mark scaled to fit the 72dp safe zone."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = 0.60 * S                      # composition fits within safe zone
    sc = box / 512
    draw_mark(d, S, (S-box)/2, (S-box)/2, sc)
    return img

out = os.path.expanduser("./android/app/src/main/res")
dens = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg_dens = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for q, S in dens.items():
    legacy_icon(S).save(f"{out}/mipmap-{q}/ic_launcher.png")
    round_icon(S).save(f"{out}/mipmap-{q}/ic_launcher_round.png")
for q, S in fg_dens.items():
    foreground(S).save(f"{out}/mipmap-{q}/ic_launcher_foreground.png")
print("icons written")
