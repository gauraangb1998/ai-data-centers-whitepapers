# Flexible AI Data Centers: white paper site

Static site, no framework, no server. Live at https://gauraangb1998.github.io/ai-data-centers-whitepapers/ (GitHub Pages, `master`).

The ask box searches the three papers in the browser. It returns passages from the papers word for word, so it cannot invent an answer. Each result links to its heading in the Google Doc.

## Files

| File | Purpose |
|---|---|
| `index.html`, `css/site.css` | Page and styles |
| `js/app.js` | Ask box, idea explorer, contents lists |
| `js/search.js` | Ranking (BM25), synonyms, excerpts |
| `js/map.js` | City map |
| `data/chunks.json` | Every passage with its section and Google Doc heading link |
| `data/ideas.json` | The 19 ideas from Part III's table |
| `tools/build_data.py` | Rebuilds both data files from the papers |
| `tools/test_queries.json`, `tools/run_tests.js` | Search regression test |

## Update after editing a paper

The Google Docs are the source of truth. The data files are a copy, so rebuild after any edit.

1. Get the current text into one folder:
   - `p1.html` from `https://docs.google.com/document/d/1DXoTDw3UmeyP8IgkP54IIlB7v-kEA7hf5ZUiXX15lTg/export?format=html`
   - `p2.html` from `https://docs.google.com/document/d/1cnM9kHOUb_kDVKs3fx8s-zxGqKIp6gTBdsKntI3T9xo/export?format=html`
   - `p3.md`: the text of Part III (a Word file in Drive, so there is no HTML export). Ask Claude to fetch it, or save the Drive text as Markdown.
2. Run `py tools/build_data.py --src <that folder> --out data`. It prints how many sections and passages it found and lists any section without a heading link.
3. Preview with `npx serve . -l 3001`, open the site, and paste `tools/run_tests.js` into the browser console. Fix any FAIL before publishing.
4. Commit and push to `master`. Pages updates in about a minute.

Heading links stay valid until a heading is deleted and retyped. After heavy edits, run step 2 again.

## Things that are written by hand in `index.html`

The three paper summaries, the key facts (150+ interviews, 10 cities, 3 conferences, 19 ideas), the conference and site-visit lists, and the About text. Check them against the papers when the papers change.
