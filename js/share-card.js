/**
 * Share card (BL-MKT-061) — self-serve post-scan shareable findings card.
 *
 * Scope constraint (see juro-workspace BACKLOG.md BL-MKT-061): this card
 * shows FINDINGS-COUNT FRAMING ONLY. It must never render a verdict, a
 * grade, or a percentage (e.g. no "Grade: C", no "70% compliant"). The
 * posture score / grade shown elsewhere on the results page must not leak
 * into this card.
 *
 * COPY STATUS: all user-facing strings below (SHARE_CARD_COPY) are a DRAFT
 * placeholder written by Tara pending Katha's copy pass and the Samiksha
 * content gate. Do not ship without that review — see PR description.
 */
(function () {
  'use strict';

  // ---- DRAFT COPY — pending Katha review / Samiksha gate before ship ----
  var SHARE_CARD_COPY = {
    eyebrow: 'COMPLIANCE SCAN · JUROCOMPLIANT.COM',
    headline: function (total) {
      if (total === 0) return '0 findings on this surface scan';
      return total + (total === 1 ? ' finding identified' : ' findings identified');
    },
    sub: function (categoriesCount, elapsedLabel) {
      var catPart =
        categoriesCount > 0
          ? 'Across ' + categoriesCount + ' compliance check' + (categoriesCount === 1 ? '' : 's')
          : 'Surface scan';
      return elapsedLabel ? catPart + ' · ' + elapsedLabel : catPart;
    },
    footer: 'Surface-layer scan · not a compliance verdict · Free scan at jurocompliant.com',
  };

  /**
   * Pure function: builds the share-card data model from scan-summary
   * inputs. No DOM access, no verdict/grade fields — findings counts only.
   * Exposed on window for direct unit testing (see tests/share-card.spec.ts).
   */
  function buildShareCardData(opts) {
    opts = opts || {};
    var domain = (opts.domain || '').replace(/^https?:\/\//, '');
    var critical = Number(opts.critical) || 0;
    var high = Number(opts.high) || 0;
    var medium = Number(opts.medium) || 0;
    var total = Number.isFinite(opts.total) ? Number(opts.total) : critical + high + medium;
    var categoriesCount = Number(opts.categoriesCount) || 0;
    var elapsedLabel = opts.elapsedLabel || '';

    return {
      eyebrow: SHARE_CARD_COPY.eyebrow,
      headline: SHARE_CARD_COPY.headline(total),
      sub: SHARE_CARD_COPY.sub(categoriesCount, elapsedLabel),
      footer: SHARE_CARD_COPY.footer,
      domain: domain,
      critical: critical,
      high: high,
      medium: medium,
      total: total,
    };
  }

  function readCurrentScanSummary() {
    var domainEl = document.getElementById('scanTargetLabel');
    var timeEl = document.getElementById('scanTimeLabel');
    var critEl = document.getElementById('cCount');
    var highEl = document.getElementById('hCount');
    var medEl = document.getElementById('mCount');
    var totalEl = document.getElementById('tCount');
    var postureRows = document.querySelectorAll('#postureRows .posture-row');

    var elapsedLabel = (timeEl && timeEl.textContent) || '';
    // "Completed in 12.3s" -> keep as-is; "Scanned N min ago" -> keep as-is.
    // Strip nothing further here; it is already human-readable from main.js.

    return {
      domain: (domainEl && domainEl.textContent) || '',
      critical: critEl ? parseInt(critEl.textContent, 10) || 0 : 0,
      high: highEl ? parseInt(highEl.textContent, 10) || 0 : 0,
      medium: medEl ? parseInt(medEl.textContent, 10) || 0 : 0,
      total: totalEl ? parseInt(totalEl.textContent, 10) || 0 : 0,
      categoriesCount: postureRows ? postureRows.length : 0,
      elapsedLabel: elapsedLabel,
    };
  }

  function renderPreview(cardData) {
    document.getElementById('shareCardEyebrow').textContent = cardData.eyebrow;
    document.getElementById('shareCardHeadline').textContent = cardData.headline;
    document.getElementById('shareCardSub').textContent = cardData.sub;
    document.getElementById('shareCardDomain').textContent = cardData.domain;
    document.getElementById('shareCardCritical').textContent = String(cardData.critical);
    document.getElementById('shareCardHigh').textContent = String(cardData.high);
    document.getElementById('shareCardMedium').textContent = String(cardData.medium);
    document.getElementById('shareCardTotal').textContent = String(cardData.total);
    document.getElementById('shareCardFooter').textContent = cardData.footer;
  }

  function drawCanvas(cardData) {
    var canvas = document.getElementById('shareCardCanvas');
    if (!canvas || !canvas.getContext) return canvas;
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

    // Accent bar
    ctx.fillStyle = '#F5C400';
    ctx.fillRect(0, 0, W, 8);

    // Eyebrow
    ctx.fillStyle = '#F5C400';
    ctx.font = '600 22px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(cardData.eyebrow, 64, 72);

    // Headline
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 64px "IBM Plex Sans", sans-serif';
    ctx.fillText(cardData.headline, 64, 130);

    // Sub
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '400 26px "IBM Plex Sans", sans-serif';
    ctx.fillText(cardData.sub, 64, 220);

    // Domain
    if (cardData.domain) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 22px "IBM Plex Mono", monospace';
      ctx.fillText(cardData.domain, 64, 262);
    }

    // Counts row
    var counts = [
      { label: 'CRITICAL', num: cardData.critical, color: '#DC2626' },
      { label: 'HIGH', num: cardData.high, color: '#D97706' },
      { label: 'MEDIUM', num: cardData.medium, color: '#A3A3A3' },
      { label: 'TOTAL', num: cardData.total, color: '#F5C400' },
    ];
    var colW = (W - 128) / counts.length;
    counts.forEach(function (c, i) {
      var x = 64 + i * colW;
      ctx.fillStyle = c.color;
      ctx.font = '600 52px "IBM Plex Mono", monospace';
      ctx.fillText(String(c.num), x, 380);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '600 18px "IBM Plex Mono", monospace';
      ctx.fillText(c.label, x, 450);
    });

    // Footer / disclaimer
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '400 20px "IBM Plex Sans", sans-serif';
    ctx.fillText(cardData.footer, 64, H - 72);

    return canvas;
  }

  function openShareCard() {
    var summary = readCurrentScanSummary();
    var cardData = buildShareCardData(summary);
    renderPreview(cardData);
    drawCanvas(cardData);
    var modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'flex';
    window.__juroShareCard = window.__juroShareCard || {};
    window.__juroShareCard.lastCardData = cardData;
  }

  function closeShareCard() {
    var modal = document.getElementById('shareCardModal');
    if (modal) modal.style.display = 'none';
  }

  function downloadShareCard() {
    var canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;
    var domain = (window.__juroShareCard && window.__juroShareCard.lastCardData && window.__juroShareCard.lastCardData.domain) || 'scan';
    var filename = 'juro-findings-' + domain.replace(/[^a-z0-9.-]/gi, '_') + '.png';
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }, 'image/png');
  }

  // Close on backdrop click, mirroring emailModal/gateModal behaviour.
  document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('shareCardModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeShareCard();
      });
    }
  });

  window.openShareCard = openShareCard;
  window.closeShareCard = closeShareCard;
  window.downloadShareCard = downloadShareCard;
  window.__juroShareCard = {
    buildShareCardData: buildShareCardData,
    SHARE_CARD_COPY: SHARE_CARD_COPY,
  };
})();
