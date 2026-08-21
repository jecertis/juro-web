#!/usr/bin/env python3
"""
BL-ENG-185: backfill the shared "Listen" (TTS) control and social share row
into every existing blog post. blog/_template.html already carries the
canonical version of these three inserts (see it for context/comments);
this script applies the identical inserts to the 11 already-published posts,
which were hand-copied from the template and have no shared templating layer.

Idempotent: re-running is a no-op on files that already have the markers.

Usage: python3 scripts/backfill-share-tts.py
"""
import pathlib
import sys

BLOG_DIR = pathlib.Path(__file__).resolve().parent.parent / "blog"
SKIP = {"_template.html", "index.html"}

LISTEN_MARKER = 'id="postListenBtn"'
SHARE_MARKER = 'class="post-share"'
SCRIPT_MARKER = '/js/blog-post.js'

LISTEN_ANCHOR = '  <article class="post-body">\n'
LISTEN_INSERT = '''  <article class="post-body">

    <div class="post-listen-row" aria-label="Listen to this article">
      <button type="button" id="postListenBtn" class="post-listen-btn" aria-pressed="false">
        <span class="post-listen-icon" aria-hidden="true">&#9654;</span>
        <span class="post-listen-label">Listen</span>
      </button>
      <button type="button" id="postListenStopBtn" class="post-listen-stop" aria-label="Stop listening">Stop</button>
    </div>
'''

SHARE_ANCHOR = '  <hr class="post-footer-rule">\n\n</main>'
SHARE_INSERT = '''  <hr class="post-footer-rule">

  <section class="post-share" aria-label="Share this article">
    <span class="post-share-label">Share this article</span>
    <div class="post-share-buttons">
      <a class="post-share-btn" data-share="linkedin" href="#" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">LinkedIn</a>
      <a class="post-share-btn" data-share="x" href="#" target="_blank" rel="noopener noreferrer" aria-label="Share on X">X</a>
      <a class="post-share-btn" data-share="email" href="#" aria-label="Share by email">Email</a>
      <button type="button" class="post-share-btn" data-share="copy" aria-label="Copy link to this article">Copy link</button>
    </div>
  </section>

</main>'''

SCRIPT_ANCHOR = '<script src="/config.js"></script>\n'
SCRIPT_INSERT = '<script src="/config.js"></script>\n<script src="/js/blog-post.js" defer></script>\n'


def patch(path: pathlib.Path) -> str:
    text = path.read_text(encoding="utf-8")
    changed = []

    if LISTEN_MARKER in text:
        pass  # already patched
    elif LISTEN_ANCHOR in text:
        text = text.replace(LISTEN_ANCHOR, LISTEN_INSERT, 1)
        changed.append("listen")
    else:
        return f"SKIP (listen anchor not found)"

    if SHARE_MARKER in text:
        pass
    elif SHARE_ANCHOR in text:
        text = text.replace(SHARE_ANCHOR, SHARE_INSERT, 1)
        changed.append("share")
    else:
        return f"SKIP (share anchor not found)"

    if SCRIPT_MARKER in text:
        pass
    elif SCRIPT_ANCHOR in text:
        text = text.replace(SCRIPT_ANCHOR, SCRIPT_INSERT, 1)
        changed.append("script-tag")
    else:
        return f"SKIP (script anchor not found)"

    if changed:
        path.write_text(text, encoding="utf-8")
        return "patched: " + ", ".join(changed)
    return "already up to date"


def main() -> int:
    posts = sorted(p for p in BLOG_DIR.glob("*.html") if p.name not in SKIP)
    if not posts:
        print("No posts found", file=sys.stderr)
        return 1
    exit_code = 0
    for p in posts:
        result = patch(p)
        print(f"{p.relative_to(BLOG_DIR.parent)}: {result}")
        if result.startswith("SKIP"):
            exit_code = 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
