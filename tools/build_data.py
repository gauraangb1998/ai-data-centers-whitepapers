#!/usr/bin/env py
"""Build data/chunks.json and data/ideas.json from the three white papers.

Inputs (in --src):
  p1.html  Google Docs HTML export of Part I   (…/export?format=html)
  p2.html  Google Docs HTML export of Part II
  p3.md    Drive text of Part III (a .docx in Drive; its contents list carries heading ids)

Run:  py tools/build_data.py --src <folder> --out data
Refresh steps are in README.md.
"""
import argparse, json, re, html
from html.parser import HTMLParser
from pathlib import Path

DOCS = {
    1: {"id": "1DXoTDw3UmeyP8IgkP54IIlB7v-kEA7hf5ZUiXX15lTg", "label": "Part I"},
    2: {"id": "1cnM9kHOUb_kDVKs3fx8s-zxGqKIp6gTBdsKntI3T9xo", "label": "Part II"},
    3: {"id": "1ItgsgvTi4BkJasZtyCY6A4x_6HsS0yhF", "label": "Part III"},
}

SKIP_TITLES = re.compile(
    r"^(acknowledg|contents|appendix|8\.1|8\.2|8\.3|8\.4|glossary|further reading|market maps|long-list)", re.I)


def clean(s):
    s = html.unescape(s).replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", clean(s).lower())


# ---------------------------------------------------------------- HTML (Parts I, II)
class DocParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []        # (kind, level, id, text)
        self.buf = []
        self.cur = None         # (kind, level, id)
        self.skip = 0           # inside <sup>, <style>, <script>, <head>
        self.in_row = False
        self.row = []
        self.cell = None
        self.table_depth = 0
        self.footnote = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("style", "script", "head", "sup"):
            self.skip += 1
            return
        if tag == "table":
            self.table_depth += 1
        elif tag == "tr" and self.table_depth:
            self.in_row, self.row = True, []
        elif tag in ("td", "th") and self.table_depth:
            self.cell = []
        elif tag in ("p", "li") and self.cell is None:
            self.cur = ("p", 0, None)
            self.buf = []
            self.footnote = False
        elif re.fullmatch(r"h[1-6]", tag) and self.cell is None:
            self.cur = ("h", int(tag[1]), a.get("id"))
            self.buf = []
        elif tag == "a" and (a.get("id") or "").startswith("ftnt") \
                and not (a.get("id") or "").startswith("ftnt_ref"):
            self.footnote = True
        elif tag == "br":
            self._add(" ")

    def handle_endtag(self, tag):
        if tag in ("style", "script", "head", "sup"):
            self.skip = max(0, self.skip - 1)
            return
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(clean(" ".join(self.cell)))
            self.cell = None
        elif tag == "tr" and self.in_row:
            cells = [c for c in self.row]
            if any(cells):
                self.blocks.append(("row", 0, None, " | ".join(cells)))
            self.in_row = False
        elif tag == "table" and self.table_depth:
            self.table_depth -= 1
        elif tag in ("p", "li") or re.fullmatch(r"h[1-6]", tag):
            if self.cur and self.cell is None:
                text = clean("".join(self.buf))
                kind, lvl, hid = self.cur
                if kind == "h":
                    self.blocks.append(("h", lvl, hid, text))
                elif text and not self.footnote:
                    self.blocks.append(("p", 0, None, text))
                self.cur = None
                self.buf = []

    def _add(self, s):
        if self.skip:
            return
        if self.cell is not None:
            self.cell.append(s)
        elif self.cur:
            self.buf.append(s)

    def handle_data(self, data):
        self._add(data)


def sections_from_html(path, paper):
    p = DocParser()
    p.feed(Path(path).read_text(encoding="utf8"))
    secs, cur, started = [], None, False
    for kind, lvl, hid, text in p.blocks:
        if kind == "h":
            title = text.strip()
            if not title:
                continue
            if not started:
                if norm(title) == "executivesummary":
                    started = True
                else:
                    continue
            cur = {"paper": paper, "level": lvl, "title": title, "hid": hid, "blocks": []}
            secs.append(cur)
        elif started and cur is not None:
            cur["blocks"].append(text)
    # numbers: numbered headings carry their own; top-level takes its first child's leading digit
    for i, s in enumerate(secs):
        m = re.match(r"^(\d{1,2}(?:\.\d+)*)\.?\s+(.*)$", s["title"])
        if m:
            s["num"], s["title"] = m.group(1), m.group(2)
        else:
            s["num"] = ""
    for i, s in enumerate(secs):
        if s["level"] == 1 and not s["num"] and i + 1 < len(secs):
            nxt = secs[i + 1]
            m = re.match(r"^(\d+)\.", nxt["num"] + ".") if nxt["num"] else None
            if m and nxt["level"] == 2:
                s["num"] = m.group(1)
    return secs


# ---------------------------------------------------------------- Markdown (Part III)
TOC_RE = re.compile(r"\[([^\]]+?) (\d+)\]\(#_heading=(h\.[a-z0-9]+)\)")


def md_inline(s):
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)
    s = re.sub(r"\[(\d+)\]\(#footnote\d+\)", "", s)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"\\(.)", r"\1", s)
    s = s.replace("**", "").replace("~~", "")
    s = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"\1", s)
    return clean(s)


def sections_from_md(path, paper):
    text = Path(path).read_text(encoding="utf8")
    toc = {}
    for t, page, hid in TOC_RE.findall(text):
        t = clean(t)
        m = re.match(r"^(\d{1,2}(?:\.\d+)*)\.?\s+(.*)$", t)
        num, title = (m.group(1), m.group(2)) if m else ("", t)
        toc[norm(title)] = {"num": num, "title": title, "hid": hid, "page": int(page)}
    secs, cur, started = [], None, False
    in_ideas_table = False
    for line in text.split("\n"):
        m = re.match(r"^(#{1,6})\s*(.*)$", line)
        if m:
            title = md_inline(m.group(2))
            if not title:
                continue
            if not started:
                if norm(title) == "executivesummary":
                    started = True
                else:
                    continue
            info = toc.get(norm(title))
            # body headings drop the leading number; the contents list has it
            num = info["num"] if info else ""
            nm = re.match(r"^(\d{1,2}(?:\.\d+)*)\.?\s+(.*)$", title)
            if nm:
                num, title = nm.group(1), nm.group(2)
                info = toc.get(norm(title), info)
            cur = {"paper": paper, "level": len(m.group(1)), "title": title, "num": num,
                   "hid": info["hid"] if info else None, "page": info["page"] if info else None,
                   "blocks": []}
            secs.append(cur)
            in_ideas_table = norm(title) == "theideasataglance"
        elif started and cur is not None:
            s = line.strip()
            if not s or s.startswith("|") and (in_ideas_table or re.match(r"^\|[\s:\-|]+\|$", s)):
                continue
            if s.startswith("|"):
                cells = [md_inline(c) for c in s.strip("|").split("|")]
                row = " | ".join(c for c in cells if c)
                if row:
                    cur["blocks"].append(row)
                continue
            s = re.sub(r"^(\*|-|\d+\.)\s+", "", s)
            s = md_inline(s)
            if s and not re.fullmatch(r"[\W_]*", s):
                cur["blocks"].append(s)
    return secs, toc, text


# Groups for the verdict board, read from his own wording in the appendix's "My view".
BANDS = [
    ("top", r"my top idea|my second pick"),
    ("weak", r"^(weak|tapped out|mostly served)"),
    ("promising", r"^promising"),
]


def band_for(view):
    v = (view or "").strip().lower()
    for name, pat in BANDS:
        if re.search(pat, v):
            return name
    return "conditional"


def parse_appendix(md_text):
    """The long-list table at the end: climate impact, what can kill it, my view, and
    the '(Part II)' marker showing the idea carried over from Part II."""
    tables, cur = [], []
    for line in md_text.split("\n"):
        if line.startswith("|"):
            cur.append(line)
        elif cur:
            tables.append(cur)
            cur = []
    if cur:
        tables.append(cur)
    target = None
    for t in tables:
        head = " ".join(t[:3]).lower()
        if "my view" in head and "kill" in head:
            target = t
    out = {}
    if not target:
        return out
    for line in target:
        c = [md_inline(x) for x in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
        if len(c) < 5:
            continue
        num = c[0].replace("\\", "").strip()
        if not re.fullmatch(r"\d+\.\d+", num):
            continue
        name = c[1]
        from_p2 = "(Part II)" in name
        out[num] = {
            "climate": c[2],
            "kill": c[3],
            "view": c[4],
            "from_part2": from_p2,
        }
    return out


def parse_ideas(md_text, toc):
    """The 19-idea table under 'The Ideas at a Glance'."""
    start = md_text.index("# The Ideas at a Glance")
    end = md_text.index("# Bitter Pills", start)
    rows = [l for l in md_text[start:end].split("\n") if l.startswith("|")]
    by_num = {v["num"]: v for v in toc.values() if v["num"]}

    def split_row(l):
        # split on unescaped pipes
        return [c.strip() for c in re.split(r"(?<!\\)\|", l.strip().strip("|"))]

    def plain(s):
        return md_inline(s)

    stages, ideas, stage = [], [], None
    for l in rows:
        c = split_row(l)
        if len(c) < 6 or re.fullmatch(r"[\s:\-]*", c[0] + c[1]):
            continue
        num = plain(c[0]).replace("\\", "")
        if not re.fullmatch(r"\d+(\.\d+)?", num):
            continue
        if "." not in num:
            info = by_num.get(num, {})
            name = plain(c[1])
            msg = info.get("title", "").split(":", 1)[1].strip() if ":" in info.get("title", "") else ""
            stage = {"num": num, "name": name, "message": msg, "hid": info.get("hid")}
            stages.append(stage)
            continue
        info = by_num.get(num, {})
        full = info.get("title", "")
        verdict = full.split(":", 1)[1].strip() if ":" in full else ""
        ideas.append({
            "num": num, "stage": stage["num"] if stage else num.split(".")[0],
            "name": full.split(":", 1)[0].strip() if full else plain(c[1]),
            "heading": full, "verdict": verdict,
            "problem": plain(c[2]), "does": plain(c[3]), "why": plain(c[4]),
            "companies": clean(re.sub(r"\\(.)", r"\1", c[5]).replace("**", "")),
            "page": info.get("page"), "hid": info.get("hid"),
        })
    return stages, ideas


# ---------------------------------------------------------------- Passages
def words(s):
    return len(s.split())


def split_long(s, cap=110):
    sents = re.split(r"(?<=[.!?])\s+(?=[A-Z\"\u201c(\[])", s)
    out, cur = [], ""
    for x in sents:
        if cur and words(cur) + words(x) > cap:
            out.append(cur)
            cur = x
        else:
            cur = (cur + " " + x).strip()
    if cur:
        out.append(cur)
    return out


def passages_for(sec):
    parts = []
    for b in sec["blocks"]:
        parts.extend(split_long(b) if words(b) > 130 else [b])
    out, cur = [], ""
    for b in parts:
        if cur and words(cur) + words(b) > 130:
            out.append(cur)
            cur = b
        elif cur and words(cur) >= 60:
            out.append(cur)
            cur = b
        else:
            cur = (cur + " " + b).strip()
    if cur:
        out.append(cur)
    return [p for p in out if words(p) >= 8]


def link_for(paper, hid):
    base = f"https://docs.google.com/document/d/{DOCS[paper]['id']}/edit"
    return f"{base}#heading={hid}" if hid else base


def build(src, out):
    src, out = Path(src), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    s1 = sections_from_html(src / "p1.html", 1)
    s2 = sections_from_html(src / "p2.html", 2)
    s3, toc3, md3 = sections_from_md(src / "p3.md", 3)
    stages, ideas = parse_ideas(md3, toc3)
    appendix = parse_appendix(md3)
    # Section 2 names 4.4 as a Part II idea although the appendix omits the marker.
    for i in ideas:
        a = appendix.get(i["num"], {})
        i["view"] = a.get("view", "")
        i["kill"] = a.get("kill", "")
        i["climate"] = a.get("climate", "")
        i["from_part2"] = a.get("from_part2", False)
    for i in ideas:
        i["band"] = band_for(i["view"])
    missing_view = [i["num"] for i in ideas if not i["view"]]
    if missing_view:
        print("ideas with no appendix verdict:", missing_view)

    chunks, sections_index, skipped = [], [], []
    for secs in (s1, s2, s3):
        parent_num = ""
        stack = []   # (level, title) of the headings above the current one
        for s in secs:
            while stack and stack[-1][0] >= s["level"]:
                stack.pop()
            parents = " > ".join(t for _, t in stack)
            stack.append((s["level"], s["title"]))
            if s["level"] == 1:
                parent_num = s["num"]
            label_num = s["num"] or parent_num
            key = (s["num"] + " " + s["title"]).strip()
            if SKIP_TITLES.search(key) or SKIP_TITLES.search(s["title"]):
                skipped.append((s["paper"], key))
                continue
            sections_index.append({"paper": s["paper"], "num": s["num"], "title": s["title"],
                                   "level": s["level"], "url": link_for(s["paper"], s["hid"])})
            for n, p in enumerate(passages_for(s)):
                chunks.append({
                    "id": f"{s['paper']}-{len(chunks)}", "paper": s["paper"],
                    "num": label_num, "title": s["title"], "parents": parents, "hid": s["hid"],
                    "url": link_for(s["paper"], s["hid"]), "text": p,
                })

    for i in ideas:
        i["url"] = link_for(3, i["hid"])
    for st in stages:
        st["url"] = link_for(3, st["hid"])

    papers_index = {str(k): {"label": v["label"], "url": f"https://docs.google.com/document/d/{v['id']}/edit"}
                    for k, v in DOCS.items()}
    # chunks.json keeps the full passage text for local work. It is gitignored:
    # the site only needs the section index, which ships as sections.json.
    (out / "chunks.json").write_text(json.dumps(
        {"papers": papers_index, "sections": sections_index, "chunks": chunks},
        ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    (out / "sections.json").write_text(json.dumps(
        {"papers": papers_index, "sections": sections_index},
        ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    (out / "ideas.json").write_text(json.dumps(
        {"stages": stages, "ideas": ideas}, ensure_ascii=False, indent=1), encoding="utf8")

    by_paper = {k: sum(1 for c in chunks if c["paper"] == k) for k in (1, 2, 3)}
    print("sections:", {k: sum(1 for s in sections_index if s["paper"] == k) for k in (1, 2, 3)})
    print("passages:", by_paper, "| ideas:", len(ideas), "| stages:", len(stages))
    print("carried over from Part II:", sum(1 for i in ideas if i["from_part2"]))
    missing = [(c["paper"], c["num"], c["title"]) for c in
               {(x["paper"], x["title"]): x for x in chunks}.values() if not c["hid"]]
    print("sections without a heading id:", missing)
    print("skipped:", skipped)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="data")
    a = ap.parse_args()
    build(a.src, a.out)
