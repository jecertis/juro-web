/**
 * blog-post.js — shared behaviour for blog post chrome (share buttons + Listen/TTS).
 *
 * Loaded on every blog/*.html post (see blog/_template.html and each post's
 * <script src="/js/blog-post.js" defer></script> tag). One file, one place
 * to fix bugs — do NOT inline copies of this into individual post files.
 *
 * Click tracking (BL-ENG-186 follow-up): there is no generic analytics-event
 * endpoint on juro-api today — only POST /api/v1/pageview exists (see the
 * beacon in blog/_template.html). Routing "Listen" clicks through that
 * endpoint would corrupt real pageview counts, so tracking here is a
 * console.debug stub until a POST /api/v1/event (or similar) endpoint ships.
 */
(function () {
  'use strict';

  function getMeta(name, attr) {
    var el = document.querySelector('meta[' + (attr || 'name') + '="' + name + '"]');
    return el ? el.getAttribute('content') : '';
  }

  function getCanonicalUrl() {
    var link = document.querySelector('link[rel="canonical"]');
    return link ? link.href : window.location.href;
  }

  function trackEvent(name) {
    try {
      console.debug('[juro-blog] event:', name, window.location.pathname);
    } catch (_) {}
  }

  // ───────────────────────── Share buttons ─────────────────────────

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (_) {
      return false;
    }
  }

  function initShare() {
    var root = document.querySelector('.post-share');
    if (!root) return;

    var url = getCanonicalUrl();
    var title = getMeta('og:title', 'property') || document.title;

    var linkedin = root.querySelector('[data-share="linkedin"]');
    if (linkedin) {
      linkedin.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    }

    var x = root.querySelector('[data-share="x"]');
    if (x) {
      x.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
    }

    var mail = root.querySelector('[data-share="email"]');
    if (mail) {
      mail.href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url);
    }

    var copyBtn = root.querySelector('[data-share="copy"]');
    if (copyBtn) {
      var originalLabel = copyBtn.textContent;
      copyBtn.addEventListener('click', function () {
        var showCopied = function (ok) {
          if (!ok) return;
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('is-copied');
          trackEvent('share_copy_link');
          setTimeout(function () {
            copyBtn.textContent = originalLabel;
            copyBtn.classList.remove('is-copied');
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { showCopied(true); }, function () {
            showCopied(fallbackCopy(url));
          });
        } else {
          showCopied(fallbackCopy(url));
        }
      });
    }

    root.querySelectorAll('[data-share="linkedin"], [data-share="x"], [data-share="email"]').forEach(function (a) {
      a.addEventListener('click', function () {
        trackEvent('share_' + a.getAttribute('data-share'));
      });
    });
  }

  // ───────────────────────── Listen (TTS) ─────────────────────────

  function initListen() {
    var row = document.querySelector('.post-listen-row');
    var btn = document.getElementById('postListenBtn');
    var stopBtn = document.getElementById('postListenStopBtn');
    var body = document.querySelector('.post-body');
    if (!row || !btn || !body) return;

    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      row.style.display = 'none';
      return;
    }

    var synth = window.speechSynthesis;
    var lang = document.documentElement.getAttribute('lang') || 'en-US';
    var queue = [];
    var queueIndex = 0;
    var state = 'idle'; // idle | playing | paused

    // Elements we never want read aloud, in addition to script/style/etc.
    var SKIP_SELECTOR = 'script, style, pre, code, .post-cta, .faq-list, .post-listen-row, [aria-hidden="true"]';

    function buildQueue() {
      var clone = body.cloneNode(true);
      clone.querySelectorAll(SKIP_SELECTOR).forEach(function (n) { n.remove(); });

      var nodes = clone.querySelectorAll('p, h2, h3, li, blockquote, summary');
      var chunks = [];
      nodes.forEach(function (node) {
        var text = node.textContent.replace(/\s+/g, ' ').trim();
        if (!text) return;
        // Split overlong nodes at sentence boundaries so Chrome doesn't
        // stall/truncate mid-utterance on long paragraphs.
        var sentences = text.match(/[^.!?]+[.!?]*(\s+|$)/g) || [text];
        var buf = '';
        sentences.forEach(function (s) {
          if ((buf + s).length > 240 && buf) {
            chunks.push(buf.trim());
            buf = s;
          } else {
            buf += s;
          }
        });
        if (buf.trim()) chunks.push(buf.trim());
      });
      return chunks;
    }

    function setLabel(text) {
      var el = btn.querySelector('.post-listen-label');
      if (el) el.textContent = text;
    }

    function speakNext() {
      if (queueIndex >= queue.length) {
        stop();
        return;
      }
      var utterance = new SpeechSynthesisUtterance(queue[queueIndex]);
      utterance.lang = lang;
      utterance.rate = 1;
      utterance.onend = function () {
        queueIndex += 1;
        if (state === 'playing') speakNext();
      };
      utterance.onerror = function () { stop(); };
      synth.speak(utterance);
    }

    function start() {
      queue = buildQueue();
      queueIndex = 0;
      if (!queue.length) return;
      synth.cancel();
      state = 'playing';
      setLabel('Pause');
      btn.setAttribute('aria-pressed', 'true');
      row.classList.add('is-active');
      trackEvent('tts_play');
      speakNext();
    }

    function pause() {
      // synth.pause() is unreliable across browsers for queued utterances;
      // cancel + remember queue position, resume re-speaks from there.
      synth.cancel();
      state = 'paused';
      setLabel('Resume');
      trackEvent('tts_pause');
    }

    function resume() {
      state = 'playing';
      setLabel('Pause');
      trackEvent('tts_resume');
      speakNext();
    }

    function stop() {
      synth.cancel();
      state = 'idle';
      queue = [];
      queueIndex = 0;
      setLabel('Listen');
      btn.setAttribute('aria-pressed', 'false');
      row.classList.remove('is-active');
    }

    btn.addEventListener('click', function () {
      if (state === 'idle') start();
      else if (state === 'playing') pause();
      else if (state === 'paused') resume();
    });

    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        if (state !== 'idle') {
          stop();
          trackEvent('tts_stop');
        }
      });
    }

    window.addEventListener('pagehide', function () { synth.cancel(); });
  }

  function init() {
    initShare();
    initListen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
