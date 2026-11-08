# flipify.py — one-off: wraps the cards in index.html into two-faced flip cards (front = content, back = brand).
import re, pathlib
p = pathlib.Path(__file__).resolve().parent.parent / "index.html"
s = p.read_text(encoding="utf-8")
BACK = '<div class="face back" aria-hidden="true"><svg class="back-mark" viewBox="0 0 100 110"><use href="#shieldOutline"/></svg><span class="back-wm">VELOURÉ</span></div>'

def wrap_block(s, open_tag, new_open, pre="", post=""):
    """Find open_tag (exact string), replace with new_open + front-face opener; close front + add back face
       before the matching close tag of that element (div-depth tracked). Optional pre/post wrappers."""
    i = s.index(open_tag)
    j = i + len(open_tag)
    depth, k = 1, j
    tag_re = re.compile(r"<(/?)(div|a|aside)\b[^>]*>")
    tagname = re.match(r"<(\w+)", open_tag).group(1)
    while depth:
        m = tag_re.search(s, k)
        assert m, "no close for " + open_tag
        if m.group(2) == tagname:
            depth += -1 if m.group(1) else 1
        k = m.end()
    close_start = s.rfind("<", 0, k)
    indent = re.search(r"\n([ \t]*)$", s[:i]).group(1) if re.search(r"\n([ \t]*)$", s[:i]) else ""
    inner = s[j:close_start]
    out = (pre + new_open + '\n' + indent + '  <div class="face front">' + inner + '</div>\n' + indent + '  ' + BACK + '\n' + indent + s[close_start:k] + post)
    return s[:i] + out + s[k:]

s = s.replace('<div class="svc-a rv" data-i="1">', '<div class="svc-a flip-wrap">').replace('<div class="svc-b rv" data-i="2">', '<div class="svc-b flip-wrap">')
s = s.replace('<div class="aside-note rv" data-i="4">', '<div class="aside-note flip-wrap">').replace('<div class="straight rv" data-i="2">', '<div class="straight flip-wrap">')
# the four plates, in document order, alternating flip direction
plates = [m.start() for m in re.finditer(r'<div class="plate">', s)]
assert len(plates) == 4, plates
for n, d in zip(range(4), ["y", "-y", "y", "-y"]):
    s = wrap_block(s, '<div class="plate">', f'<div class="plate flip" data-flip="{d}">')
# path-finder panel: wrapper takes the grid slot
s = wrap_block(s, '<div class="router rv" id="routerBox" data-i="1">', '<div class="router flip" id="routerBox" data-flip="x">',
               pre='<div class="router-wrap flip-wrap">', post='</div>')
# booking / application box
s = s.replace('<div class="contact-grid rv" data-i="1">', '<div class="contact-grid">')
s = wrap_block(s, '<div class="startbox">', '<div class="startbox flip" data-flip="x">', pre='<div class="startbox-wrap flip-wrap">', post='</div>')
# portal card (an <a>)
s = s.replace('<aside class="cinfo">', '<aside class="cinfo rv">')
s = wrap_block(s, '<a class="portal" href="https://app.orioncapitalfunding.com" data-app="">',
               '<a class="portal flip" href="https://app.orioncapitalfunding.com" data-app="" data-flip="y">', pre='<div class="flip-wrap">', post='</div>')
s = s.replace('<script src="shield.js" defer></script>', '<script src="shield.js" defer></script>\n<script src="flip.js" defer></script>')
p.write_text(s, encoding="utf-8")
print("flip cards:", s.count('class="face front"'), "| backs:", s.count('class="face back"'), "| wraps:", s.count("flip-wrap"))
