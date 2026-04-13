/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.resolve(__dirname, "../jurocompliant.html"),
  "utf-8"
);

function loadPage() {
  document.documentElement.innerHTML = html;
  window.JURO_API_URL = "http://localhost:3000";

  const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (scriptContent) {
    const patched = scriptContent
      .replace(/^(async )?function (\w+)/gm, "window.$2 = $1function $2")
      .replace(/^let scanning/m, "window.scanning")
      .replace(/^let lastScanTime/m, "window.lastScanTime")
      .replace(/^const SCAN_COOLDOWN_MS/m, "window.SCAN_COOLDOWN_MS");
    const fn = new Function(patched);
    fn.call(window);
  }
}

beforeEach(() => {
  jest.restoreAllMocks();
  global.fetch = jest.fn();
  global.alert = jest.fn();
  loadPage();
  // Reset rate limit between tests
  window.lastScanTime = 0;
});

afterEach(() => {
  delete global.fetch;
});

// ── DOM structure ──

describe("page structure", () => {
  test("has the scan input and button", () => {
    expect(document.getElementById("urlInput")).not.toBeNull();
    expect(document.getElementById("scanBtn")).not.toBeNull();
  });

  test("has the empty state visible by default", () => {
    const empty = document.getElementById("emptyState");
    expect(empty).not.toBeNull();
    expect(empty.style.display).not.toBe("none");
  });

  test("results area is hidden by default", () => {
    expect(document.getElementById("resultsArea").style.display).toBe("none");
  });

  test("has progress bar elements", () => {
    expect(document.getElementById("progressWrap")).not.toBeNull();
    expect(document.getElementById("progressFill")).not.toBeNull();
    expect(document.getElementById("progressStatus")).not.toBeNull();
  });

  test("has all severity count elements", () => {
    expect(document.getElementById("cCount")).not.toBeNull();
    expect(document.getElementById("hCount")).not.toBeNull();
    expect(document.getElementById("mCount")).not.toBeNull();
    expect(document.getElementById("tCount")).not.toBeNull();
  });

  test("has the consent checkbox", () => {
    expect(document.getElementById("consentBox")).not.toBeNull();
  });

  test("does not have quick-pick buttons", () => {
    const picks = document.querySelectorAll(".quick-pick");
    expect(picks.length).toBe(0);
  });
});

// ── Consent gate ──

describe("consent gate", () => {
  test("blocks scan when consent is not checked", async () => {
    document.getElementById("urlInput").value = "test.com";
    document.getElementById("consentBox").checked = false;

    await window.startScan();

    expect(global.alert).toHaveBeenCalledWith(
      "Please confirm you are authorised to scan this domain."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("allows scan when consent is checked", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://test.com",
          elapsed: "1",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "test.com";
    document.getElementById("consentBox").checked = true;

    await window.startScan();

    expect(global.fetch).toHaveBeenCalled();
  });
});

// ── Rate limiting ──

describe("rate limiting", () => {
  test("blocks scan within cooldown period", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://a.com",
          elapsed: "1",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "a.com";
    document.getElementById("consentBox").checked = true;

    // First scan succeeds
    await window.startScan();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second scan within cooldown is blocked
    await window.startScan();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Please wait")
    );
  });

  test("allows scan after cooldown expires", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://b.com",
          elapsed: "1",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "b.com";
    document.getElementById("consentBox").checked = true;

    await window.startScan();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Simulate cooldown expired
    window.lastScanTime = Date.now() - 61000;

    await window.startScan();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ── renderResults ──

describe("renderResults", () => {
  const mockData = {
    url: "https://example.com",
    elapsed: "5.2",
    posture: [
      { rule: "Consent Management", status: "fail" },
      { rule: "Cookie Compliance", status: "pass" },
    ],
    findings: [
      {
        id: "F-001",
        sev: "critical",
        title: "No consent mechanism detected",
        rule: "DPDP Section 6(1)",
        desc: "No consent mechanism on page load",
        location: "Website — example.com",
        remediation: "Add a consent banner",
      },
      {
        id: "F-002",
        sev: "high",
        title: "Tracking before consent",
        rule: "DPDP Section 5(1)",
        desc: "Google Analytics fires before consent",
        location: "Website — example.com",
        remediation: "Defer tracker loading until consent",
      },
      {
        id: "F-003",
        sev: "medium",
        title: "Missing privacy notice link",
        rule: "DPDP Section 5(2)",
        desc: "No link to privacy policy found",
        location: "Website — example.com",
        remediation: "Add a visible privacy notice link",
      },
    ],
  };

  test("displays the results area", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    expect(document.getElementById("resultsArea").style.display).toBe("block");
  });

  test("shows the scan target and elapsed time", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    expect(document.getElementById("scanTargetLabel").textContent).toBe(
      "example.com"
    );
    expect(document.getElementById("scanTimeLabel").textContent).toBe(
      "Completed in 5.2s"
    );
  });

  test("counts findings by severity correctly", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    expect(document.getElementById("cCount").textContent).toBe("1");
    expect(document.getElementById("hCount").textContent).toBe("1");
    expect(document.getElementById("mCount").textContent).toBe("1");
    expect(document.getElementById("tCount").textContent).toBe("3");
  });

  test("renders posture rows with correct status", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    const rows = document.querySelectorAll(".posture-row");
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector(".status-pill").textContent).toBe(
      "Non-compliant"
    );
    expect(rows[1].querySelector(".status-pill").textContent).toBe("Compliant");
  });

  test("renders finding cards with correct severity classes", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    const cards = document.querySelectorAll(".finding-card");
    expect(cards.length).toBe(3);
    expect(cards[0].classList.contains("critical")).toBe(true);
    expect(cards[1].classList.contains("high")).toBe(true);
    expect(cards[2].classList.contains("medium")).toBe(true);
  });

  test("first finding body is open, rest are closed", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    const bodies = document.querySelectorAll(".finding-body");
    expect(bodies[0].classList.contains("open")).toBe(true);
    expect(bodies[1].classList.contains("open")).toBe(false);
    expect(bodies[2].classList.contains("open")).toBe(false);
  });

  test("renders remediation box for each finding", () => {
    window.renderResults(mockData, mockData.url, mockData.elapsed);
    const boxes = document.querySelectorAll(".remediation-box");
    expect(boxes.length).toBe(3);
    expect(boxes[0].textContent).toContain("Add a consent banner");
  });

  test("handles null findings gracefully", () => {
    const noFindings = { url: "https://empty.com", elapsed: "1.0" };
    window.renderResults(noFindings, noFindings.url, noFindings.elapsed);
    expect(document.getElementById("tCount").textContent).toBe("0");
    expect(document.getElementById("findingsList").textContent).toContain(
      "No findings"
    );
  });

  test("handles empty findings array", () => {
    const emptyData = {
      url: "https://clean.com",
      elapsed: "2.0",
      findings: [],
      posture: [],
    };
    window.renderResults(emptyData, emptyData.url, emptyData.elapsed);
    expect(document.getElementById("tCount").textContent).toBe("0");
    expect(document.getElementById("cCount").textContent).toBe("0");
  });

  test("strips protocol from scan target label", () => {
    window.renderResults(mockData, "http://example.com", "1");
    expect(document.getElementById("scanTargetLabel").textContent).toBe(
      "example.com"
    );
  });
});

// ── toggleFinding ──

describe("toggleFinding", () => {
  test("toggles the finding body open/closed", () => {
    window.renderResults(
      {
        url: "https://test.com",
        elapsed: "1",
        posture: [],
        findings: [
          {
            id: "F-001",
            sev: "critical",
            title: "Test",
            rule: "S1",
            desc: "Desc",
            location: "loc",
            remediation: "Fix it",
          },
        ],
      },
      "https://test.com",
      "1"
    );

    const head = document.querySelector(".finding-head");
    const body = document.querySelector(".finding-body");

    expect(body.classList.contains("open")).toBe(true);
    window.toggleFinding(head);
    expect(body.classList.contains("open")).toBe(false);
    window.toggleFinding(head);
    expect(body.classList.contains("open")).toBe(true);
  });
});

// ── startScan ──

describe("startScan", () => {
  beforeEach(() => {
    document.getElementById("consentBox").checked = true;
  });

  test("does nothing when input is empty", async () => {
    document.getElementById("urlInput").value = "";
    await window.startScan();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("does nothing when input is whitespace", async () => {
    document.getElementById("urlInput").value = "   ";
    await window.startScan();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("disables button and shows progress during scan", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://test.com",
          elapsed: "3.0",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "test.com";
    const promise = window.startScan();

    expect(document.getElementById("scanBtn").disabled).toBe(true);
    expect(document.getElementById("scanBtn").textContent).toBe("Scanning...");
    expect(document.getElementById("progressWrap").style.display).toBe("block");
    expect(document.getElementById("emptyState").style.display).toBe("none");

    await promise;

    expect(document.getElementById("scanBtn").disabled).toBe(false);
    expect(document.getElementById("scanBtn").textContent).toBe("Scan again");
  });

  test("sends correct POST request to API", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://mysite.com",
          elapsed: "4.0",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "mysite.com";
    await window.startScan();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/scan",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "mysite.com" }),
      }
    );
  });

  test("prevents concurrent scans", async () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://a.com",
          elapsed: "1",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "a.com";
    const first = window.startScan();
    const second = window.startScan();

    await Promise.all([first, second]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("shows alert on network error", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    document.getElementById("urlInput").value = "fail.com";
    await window.startScan();

    expect(global.alert).toHaveBeenCalledWith(
      "Failed to connect to scanner API. Ensure the backend is running."
    );
  });

  test("shows alert on API error response", async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ error: "domain_not_verified" }),
    });

    document.getElementById("urlInput").value = "blocked.com";
    await window.startScan();

    expect(global.alert).toHaveBeenCalledWith(
      "Scan failed: domain_not_verified"
    );
  });

  test("re-enables scanning after error", async () => {
    global.fetch.mockRejectedValue(new Error("fail"));

    document.getElementById("urlInput").value = "err.com";
    await window.startScan();

    expect(window.scanning).toBe(false);
    expect(document.getElementById("scanBtn").disabled).toBe(false);
  });
});

// ── keyboard interaction ──

describe("keyboard interaction", () => {
  beforeEach(() => {
    document.getElementById("consentBox").checked = true;
  });

  test("Enter key triggers scan", () => {
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          url: "https://enter.com",
          elapsed: "1",
          posture: [],
          findings: [],
        }),
    });

    document.getElementById("urlInput").value = "enter.com";
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    });
    document.getElementById("urlInput").dispatchEvent(event);

    expect(global.fetch).toHaveBeenCalled();
  });

  test("non-Enter key does not trigger scan", () => {
    document.getElementById("urlInput").value = "test.com";
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
    document.getElementById("urlInput").dispatchEvent(event);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
