#!/usr/bin/env python3
"""Colortime painting prompt tester for fal.ai.

  python3 generate.py batch [--styles a,b] [--subjects a,b] [--models a,b]
      Every style x subject x model; writes images and a contact sheet.
  python3 generate.py layers
      Generates one ground and separate pieces on white, then composites
      them two ways: multiply (like transparent cards) and cut-out.

Reads FAL_KEY from the environment. In the Claude cloud session the key is
added by the network proxy, so any placeholder value works there.
"""
import argparse
import concurrent.futures as cf
import io
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "prompts.json").read_text())
KEY = os.environ.get("FAL_KEY", "proxy-injected")


def call(endpoint, payload, tries=3):
    req = urllib.request.Request(
        f"https://fal.run/{endpoint}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Key {KEY}", "Content-Type": "application/json"},
    )
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")[:400]
            if e.code < 500 or attempt == tries - 1:
                raise RuntimeError(f"{endpoint}: HTTP {e.code} {body}") from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == tries - 1:
                raise
        time.sleep(3 * (attempt + 1))


def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def generate(model_id, prompt, seed=None, kind="args"):
    m = CONFIG["models"][model_id]
    payload = {"prompt": prompt, **m.get(kind, m["args"])}
    if seed is not None:
        payload["seed"] = seed
    out = call(m["endpoint"], payload)
    url = out["images"][0]["url"]
    return url, fetch(url)


def label_font(size):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def contact_sheet(rows, cols, cells, path, tw=300, th=400):
    """cells: {(row, col): Image or None}"""
    pad, left, top = 12, 150, 36
    W = left + len(cols) * (tw + pad) + pad
    H = top + len(rows) * (th + pad) + pad
    sheet = Image.new("RGB", (W, H), "#F3F1EC")
    d = ImageDraw.Draw(sheet)
    f = label_font(16)
    for j, c in enumerate(cols):
        d.text((left + j * (tw + pad) + 4, 10), c, fill="#1E2227", font=f)
    for i, r in enumerate(rows):
        y = top + i * (th + pad)
        for k, line in enumerate(r.split(" / ")):
            d.text((12, y + 8 + 22 * k), line, fill="#1E2227", font=f)
        for j, c in enumerate(cols):
            x = left + j * (tw + pad)
            img = cells.get((r, c))
            if img is None:
                d.rectangle([x, y, x + tw, y + th], outline="#B5321F", width=2)
                d.text((x + 10, y + 10), "failed", fill="#B5321F", font=f)
                continue
            im = img.convert("RGB")
            im.thumbnail((tw, th))
            sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
    sheet.save(path, quality=88)


def run_dir(kind):
    d = ROOT / "out" / f"{time.strftime('%Y%m%d-%H%M%S')}-{kind}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def pick(all_ids, wanted):
    return [i for i in all_ids if not wanted or i in wanted.split(",")]


def batch(args):
    styles = pick(list(CONFIG["styles"]), args.styles)
    subjects = [s for s in CONFIG["subjects"] if not args.subjects or s["id"] in args.subjects.split(",")]
    models = pick(list(CONFIG["models"]), args.models)
    out = run_dir("batch")
    jobs = []
    for st in styles:
        for sub in subjects:
            prompt = CONFIG["styles"][st].format(shape=sub["shape"], scene=sub["scene"])
            for m in models:
                jobs.append((st, sub["id"], m, prompt))
    print(f"{len(jobs)} images -> {out}")
    cells, manifest = {}, []

    def work(job):
        st, sid, m, prompt = job
        url, img = generate(m, prompt, args.seed)
        name = f"{st}_{sid}_{m}.png"
        img.convert("RGB").save(out / name.replace(".png", ".jpg"), quality=92)
        return job, url, img

    with cf.ThreadPoolExecutor(6) as pool:
        futs = {pool.submit(work, j): j for j in jobs}
        for f in cf.as_completed(futs):
            st, sid, m, prompt = futs[f]
            row = f"{st} / {sid}"
            try:
                _, url, img = f.result()
                cells[(row, m)] = img
                manifest.append({"style": st, "subject": sid, "model": m, "prompt": prompt, "url": url})
                print(f"  ok   {row} {m}")
            except Exception as e:  # keep going; failures show on the sheet
                manifest.append({"style": st, "subject": sid, "model": m, "prompt": prompt, "error": str(e)})
                print(f"  FAIL {row} {m}: {e}", file=sys.stderr)
    rows = [f"{st} / {s['id']}" for st in styles for s in subjects]
    contact_sheet(rows, models, cells, out / "sheet.jpg")
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"sheet: {out / 'sheet.jpg'}")


def layers(args):
    L = CONFIG["layers"]
    model = args.models or L["model"]
    out = run_dir("layers")
    print(f"ground + {len(L['pieces'])} pieces with {model} -> {out}")
    with cf.ThreadPoolExecutor(6) as pool:
        g = pool.submit(generate, model, L["ground"], args.seed)
        ps = {p["id"]: pool.submit(generate, model, L["piece"].format(object=p["object"]), args.seed) for p in L["pieces"]}
        g_url, ground = g.result()
        pieces = {k: f.result() for k, f in ps.items()}
    ground.convert("RGB").save(out / "ground.jpg", quality=92)
    for k, (_, im) in pieces.items():
        im.convert("RGB").save(out / f"piece_{k}.jpg", quality=92)

    # Cut-outs through BiRefNet
    with cf.ThreadPoolExecutor(6) as pool:
        cuts = {k: pool.submit(call, "fal-ai/birefnet/v2", {"image_url": u, "output_format": "png"}) for k, (u, _) in pieces.items()}
        cutouts = {k: fetch(f.result()["image"]["url"]) for k, f in cuts.items()}
    for k, im in cutouts.items():
        im.save(out / f"cutout_{k}.png")

    W, H = ground.size
    multiply = ground.convert("RGB")
    cutout = ground.copy()
    for p in L["pieces"]:
        k = p["id"]
        tw = int(W * p["w"])
        # Multiply: the white page around a piece vanishes, like a transparent card
        src = pieces[k][1].convert("RGB")
        cut = cutouts[k]
        bbox = cut.getbbox() or (0, 0, *cut.size)
        src, cut = src.crop(bbox), cut.crop(bbox)
        th = int(src.height * tw / src.width)
        src, cut = src.resize((tw, th)), cut.resize((tw, th))
        x, y = int(W * p["x"] - tw / 2), int(H * p["y"] - th)
        layer = Image.new("RGB", (W, H), "white")
        layer.paste(src, (x, y))
        multiply = ImageChops.multiply(multiply, layer)
        cutout.alpha_composite(cut, (x, y))
    multiply.save(out / "composite_multiply.jpg", quality=92)
    cutout.convert("RGB").save(out / "composite_cutout.jpg", quality=92)

    tiles = {("ground and pieces", "ground"): ground}
    for p in L["pieces"]:
        tiles[("ground and pieces", p["id"])] = pieces[p["id"]][1]
    tiles[("composites", "ground")] = multiply
    tiles[("composites", L["pieces"][0]["id"])] = cutout
    contact_sheet(["ground and pieces", "composites"], ["ground"] + [p["id"] for p in L["pieces"]], tiles, out / "sheet.jpg")
    print(f"sheet: {out / 'sheet.jpg'}  (composites row: multiply, then cut-out)")


def mockups(args):
    M = CONFIG["mockups"]
    models = pick(M["models"], args.models)
    variants = [v for v in M["variants"] if not args.styles or v["id"] in args.styles.split(",")]
    out = run_dir("mockups")
    jobs = [(v, m) for v in variants for m in models]
    print(f"{len(jobs)} mockups -> {out}")
    cells, manifest = {}, []
    with cf.ThreadPoolExecutor(6) as pool:
        futs = {pool.submit(generate, m, v["prompt"], args.seed, "args_mockup"): (v, m) for v, m in jobs}
        for f in cf.as_completed(futs):
            v, m = futs[f]
            try:
                url, img = f.result()
                img.convert("RGB").save(out / f"{v['id']}_{m}.jpg", quality=92)
                cells[(v["id"], m)] = img
                manifest.append({"variant": v["id"], "model": m, "url": url})
                print(f"  ok   {v['id']} {m}")
            except Exception as e:
                manifest.append({"variant": v["id"], "model": m, "error": str(e)})
                print(f"  FAIL {v['id']} {m}: {e}", file=sys.stderr)
    contact_sheet([v["id"] for v in variants], models, cells, out / "sheet.jpg", tw=300, th=533)
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"sheet: {out / 'sheet.jpg'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["batch", "layers", "mockups"])
    ap.add_argument("--styles")
    ap.add_argument("--subjects")
    ap.add_argument("--models")
    ap.add_argument("--seed", type=int)
    a = ap.parse_args()
    {"batch": batch, "layers": layers, "mockups": mockups}[a.mode](a)
