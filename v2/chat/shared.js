(function initChatProto(global) {
  const phases = [
    { id: "detect", label: "Detect" },
    { id: "diagnose", label: "Diagnose" },
    { id: "decide", label: "Decide" },
    { id: "act", label: "Act" },
    { id: "verify", label: "Verify" }
  ];

  const mission = {
    title: "Restore staging readiness",
    subtitle: "Staging / Service recovery / Active",
    objective: "Return `nucleusapp` to a ready state without widening blast radius.",
    nextAction: "Compare the newest revision against the last ready deployment.",
    meta: [
      { text: "Started 8m ago", tone: "cool" },
      { text: "Source confidence: live", tone: "good" },
      { text: "1 likely root cause", tone: "warn" }
    ],
    evidence: [
      { text: "Live runtime", tone: "good" },
      { text: "Release linked", tone: "cool" },
      { text: "Provider healthy", tone: "good" },
      { text: "12s freshness", tone: "cool" }
    ],
    quickAsks: [
      "Why is this degraded?",
      "Show safest next step",
      "Explain confidence",
      "What changed recently?",
      "Give rollback path",
      "Summarize for handoff"
    ],
    links: [
      { label: "Open GCP", detail: "cloud run service", kind: "service" },
      { label: "Open GitHub workflow", detail: "release workflow", kind: "workflow" },
      { label: "Open logs", detail: "readiness failures", kind: "logs" },
      { label: "Compare to prod", detail: "env + traffic", kind: "compare" }
    ],
    entities: [
      { label: "Service", value: "nucleusapp" },
      { label: "Revision", value: "r-238" },
      { label: "Last ready", value: "r-237" },
      { label: "Release", value: "2026.03.17-rc4" }
    ]
  };

  const story = [
    {
      kind: "oracle",
      phase: "diagnose",
      label: "Likely root cause",
      summary: "`nucleusapp` is the most likely root cause. The newest revision is unready while dependent services remain healthy.",
      cards: [
        { kicker: "Inspect", title: "Inspect service state", body: "Open readiness, rollout, and probe detail for the scoped service." },
        { kicker: "Compare", title: "Compare ready revision", body: "Diff the current revision against the last known ready deployment." },
        { kicker: "Guide", title: "Run readiness checklist", body: "Step through the safest short list before acting." }
      ],
      followups: ["Show likely causes", "Run readiness checklist", "Switch to rollback path"],
      evidence: [
        { text: "Scoped object: nucleusapp", tone: "cool" },
        { text: "Blast radius: low", tone: "good" },
        { text: "Fresh evidence", tone: "good" }
      ]
    },
    {
      kind: "operator",
      phase: "diagnose",
      prompt: "Compare the current revision to the last ready deployment."
    },
    {
      kind: "oracle",
      phase: "decide",
      label: "Revision comparison",
      summary: "Revision `r-238` fails readiness 17 seconds after boot. Drift is isolated to one env block introduced with release `2026.03.17-rc4`.",
      cards: [
        { kicker: "Proof", title: "View failing probes", body: "Three consecutive readiness probes time out after the config load stage." },
        { kicker: "Diff", title: "Compare env vars", body: "One staging-only variable changed between `r-237` and `r-238`." },
        { kicker: "Plan", title: "Prepare rollback path", body: "Queue the lowest-risk rollback without touching downstream services." }
      ],
      followups: ["Explain confidence", "Prepare rollback path", "Keep investigating"],
      evidence: [
        { text: "Probe timeout +7s", tone: "warn" },
        { text: "Config drift: 1 block", tone: "warn" },
        { text: "Dependencies stable", tone: "good" }
      ]
    },
    {
      kind: "operator",
      phase: "act",
      prompt: "Prepare the safest rollback path and keep the change scoped to `nucleusapp`."
    },
    {
      kind: "oracle",
      phase: "act",
      label: "Safe action",
      summary: "Rollback to `r-237` is safe. No schema mismatch or downstream dependency change was detected.",
      cards: [
        { kicker: "Act", title: "Start rollback", body: "Shift traffic back to `r-237` and preserve the current failure snapshot." },
        { kicker: "Notify", title: "Notify channel", body: "Post a concise note with scope, confidence, and expected verification time." },
        { kicker: "Audit", title: "Open change log", body: "Capture the release diff so follow-up work stays anchored to evidence." }
      ],
      followups: ["Start rollback", "Show blast radius", "Explain confidence"],
      evidence: [
        { text: "Schema safe", tone: "good" },
        { text: "Traffic shift ready", tone: "cool" },
        { text: "Risk: contained", tone: "good" }
      ]
    },
    {
      kind: "system",
      phase: "verify",
      label: "Rollback initiated",
      detail: "Traffic is shifting back to `r-237`. Readiness probes are being re-sampled."
    },
    {
      kind: "oracle",
      phase: "verify",
      label: "Verification",
      summary: "Readiness recovered. Continue with smoke verification and post a short handoff summary.",
      checklist: [
        "Edge route returns 200 for the primary staging path.",
        "Auth dependency responds within expected latency.",
        "Error rate returns to baseline.",
        "Release and incident channels are updated."
      ],
      cards: [
        { kicker: "Verify", title: "Run smoke checks", body: "Use the short verification path before resolving the mission." },
        { kicker: "Summarize", title: "Generate handoff", body: "Produce a concise summary with action, evidence, and follow-up." }
      ],
      followups: ["Summarize for handoff", "Mark resolved", "Open proof drawer"],
      evidence: [
        { text: "Ready checks green", tone: "good" },
        { text: "Error rate normal", tone: "good" },
        { text: "Freshness: 4s", tone: "cool" }
      ]
    },
    {
      kind: "system",
      phase: "verify",
      label: "Mission ready to resolve",
      detail: "All required checks are green. Remaining work is documentation and handoff."
    }
  ];

  const prototypes = [
    {
      file: "01-orbit-cockpit.html",
      tone: "orbit",
      title: "Orbit Cockpit",
      description: "A center-weighted mission cockpit with an orbital core, guided thread blocks, and pull-out proof drawers."
    },
    {
      file: "02-glass-briefing.html",
      tone: "glass",
      title: "Glass Briefing",
      description: "Layered material sheets that make Oracle turns feel like briefing cards instead of chat bubbles."
    },
    {
      file: "03-signal-rail.html",
      tone: "rail",
      title: "Signal Rail",
      description: "A horizontal mission rail where each turn becomes a station on a kinetic action timeline."
    },
    {
      file: "04-atlas-board.html",
      tone: "atlas",
      title: "Atlas Board",
      description: "An asymmetric operations board with linked entity capsules and spatially arranged Oracle episodes."
    },
    {
      file: "05-verification-cascade.html",
      tone: "cascade",
      title: "Verification Cascade",
      description: "A procedural waterfall that compresses finished work and expands the live verification checkpoint."
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function codeWrap(value) {
    return escapeHtml(value).replace(/`([^`]+)`/g, '<span class="code">$1</span>');
  }

  function headerMarkup(config) {
    return `
      <header class="page-header">
        <div>
          <span class="eyebrow">${escapeHtml(config.eyebrow || "Mission Chat Prototype")}</span>
          <h1>${escapeHtml(config.title)}</h1>
          <p>${escapeHtml(config.note)}</p>
        </div>
        <div class="header-actions">
          <a class="back-link" href="${escapeHtml(config.backHref || "./index.html")}">All Prototypes</a>
          <button class="replay-button" type="button" data-replay-target="${escapeHtml(config.replayId || "replay")}">Replay simulation</button>
        </div>
      </header>
    `;
  }

  function statusPillMarkup(item) {
    return `<span class="status-pill" data-tone="${escapeHtml(item.tone || "cool")}">${escapeHtml(item.text)}</span>`;
  }

  function chipMarkup(item) {
    if (typeof item === "string") {
      return `<span class="mini-chip cool">${escapeHtml(item)}</span>`;
    }
    return `<span class="mini-chip ${escapeHtml(item.tone || "cool")}">${escapeHtml(item.text)}</span>`;
  }

  function actionCardMarkup(card) {
    return `
      <article class="action-card">
        <span class="action-kicker">${escapeHtml(card.kicker || "Action")}</span>
        <strong>${escapeHtml(card.title)}</strong>
        <p>${escapeHtml(card.body)}</p>
      </article>
    `;
  }

  function cardsMarkup(cards) {
    return `<div class="action-grid">${(cards || []).map(actionCardMarkup).join("")}</div>`;
  }

  function followupsMarkup(items) {
    return `<div class="followup-row">${(items || []).map((item) => `<button class="followup-pill" type="button">${escapeHtml(item)}</button>`).join("")}</div>`;
  }

  function evidenceMarkup(items) {
    return `<div class="mini-chip-row">${(items || []).map(chipMarkup).join("")}</div>`;
  }

  function checklistMarkup(items) {
    return `<ul class="checklist">${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function entityListMarkup(items) {
    return `
      <div class="entity-list">
        ${(items || []).map((item) => `
          <div class="entity-capsule">
            <span class="entity-label">${escapeHtml(item.label)}</span>
            <span class="entity-value">${escapeHtml(item.value)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function phaseIndex(phaseId) {
    if (phaseId === "resolved") {
      return phases.length;
    }
    return Math.max(0, phases.findIndex((phase) => phase.id === phaseId));
  }

  function phaseRailMarkup(activePhase) {
    const activeIndex = phaseIndex(activePhase);
    return phases.map((phase, index) => {
      let state = "future";
      if (index < activeIndex) {
        state = "done";
      } else if (index === activeIndex) {
        state = "current";
      }
      return `
        <div class="phase-pill phase-${state}" data-phase="${escapeHtml(phase.id)}">
          <span>${escapeHtml(phase.label)}</span>
          <small>${String(index + 1).padStart(2, "0")}</small>
        </div>
      `;
    }).join("");
  }

  function applyPhaseRail(root, activePhase) {
    if (!root) {
      return;
    }
    root.innerHTML = phaseRailMarkup(activePhase);
  }

  function createSequencer(config) {
    const timers = [];
    const steps = config.steps || [];
    const startDelay = config.startDelay || 400;
    const gap = config.gap || 1350;
    const loopDelay = config.loopDelay || 2600;

    function clear() {
      while (timers.length) {
        global.clearTimeout(timers.pop());
      }
    }

    function run() {
      if (typeof config.onReset === "function") {
        config.onReset();
      }

      steps.forEach((step, index) => {
        timers.push(global.setTimeout(() => {
          config.onStep(step, index);
        }, startDelay + index * gap));
      });

      if (config.loop) {
        timers.push(global.setTimeout(run, startDelay + steps.length * gap + loopDelay));
      }
    }

    run();

    return {
      restart() {
        clear();
        run();
      },
      stop() {
        clear();
      }
    };
  }

  function bindReplay(button, controller) {
    if (!button) {
      return;
    }
    button.addEventListener("click", () => controller.restart());
  }

  global.ChatProto = {
    phases,
    mission,
    story,
    prototypes,
    escapeHtml,
    codeWrap,
    headerMarkup,
    statusPillMarkup,
    chipMarkup,
    cardsMarkup,
    followupsMarkup,
    evidenceMarkup,
    checklistMarkup,
    entityListMarkup,
    phaseRailMarkup,
    applyPhaseRail,
    createSequencer,
    bindReplay
  };
})(window);
