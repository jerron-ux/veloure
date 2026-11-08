# reel.py — Instagram reel (or any local video) → frames + contact sheets for style reading.
# usage:  uv run python tools/reel.py <instagram-url | path/to/video.mp4> [fps]
# output: reference/<name>/frames/f_###.png (720 px wide), reference/<name>/sheet-N.png (5x2 tiles),
#         reference/<name>/info.txt (duration, size). Public reels download without login via uvx yt-dlp.
import pathlib, subprocess, sys, re, shutil

R = pathlib.Path(__file__).resolve().parent.parent
src = sys.argv[1]
fps = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0

def run(cmd, **kw):
    print("+", " ".join(cmd)); return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)

if re.match(r"https?://", src):
    m = re.search(r"/(?:reels?|p)/([A-Za-z0-9_-]+)", src)
    name = "reel-" + (m.group(1) if m else "x")
    out = R / "reference" / name; out.mkdir(parents=True, exist_ok=True)
    video = out / "reel.mp4"
    if not video.exists():
        run(["uvx", "yt-dlp", "-o", str(video.with_suffix(".%(ext)s")), "-f", "mp4/best", src])
        cands = list(out.glob("reel.*"))
        vids = [c for c in cands if c.suffix.lower() in (".mp4", ".webm", ".mov", ".mkv")]
        if vids and vids[0] != video: shutil.move(str(vids[0]), str(video))
else:
    p = pathlib.Path(src)
    name = re.sub(r"[^A-Za-z0-9_-]+", "-", p.stem)[:40]
    out = R / "reference" / name; out.mkdir(parents=True, exist_ok=True)
    video = out / ("reel" + p.suffix.lower())
    if not video.exists(): shutil.copy(str(p), str(video))

frames = out / "frames"; frames.mkdir(exist_ok=True)
for f in frames.glob("*.png"): f.unlink()
info = run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "default=nw=1", str(video)]).stdout
(out / "info.txt").write_text(info, encoding="utf-8")
run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"fps={fps},scale=720:-2", str(frames / "f_%03d.png")])
n = len(list(frames.glob("f_*.png")))
# contact sheets, 10 frames each
for s in range(0, n, 10):
    run(["ffmpeg", "-v", "error", "-y", "-start_number", str(s + 1), "-i", str(frames / "f_%03d.png"),
         "-frames:v", "1", "-vf", "scale=480:-2,tile=5x2:padding=4:margin=4:color=0x202020", str(out / f"sheet-{s // 10 + 1}.png")])
print(info.strip().replace("\n", " "), "| frames:", n, "| sheets:", len(list(out.glob("sheet-*.png"))), "| dir:", out)
