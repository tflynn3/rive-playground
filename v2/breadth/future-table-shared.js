(function initFutureTableLab(global) {
  const world = {
    slice: "west-prod",
    releaseLabel: "world deploy active",
    releaseVersion: "v2.4.0",
    imageTag: "ghcr.io/nucleus/world:prod-2026.03.15.01",
    imageShort: "world:prod-2026.03.15.01",
    previousImageTag: "ghcr.io/nucleus/world:prod-2026.03.08.04",
    previousImageShort: "world:prod-2026.03.08.04"
  };

  const domainMeta = {
    frontend: { label: "Frontend", color: "#79edff", note: "Entry surfaces, traffic shaping, and operator touchpoints." },
    auth: { label: "Auth", color: "#ffd166", note: "Identity, policy, trust, and session enforcement." },
    core: { label: "Core", color: "#68f6c7", note: "Primary business orchestration and system intent." },
    processors: { label: "Processors", color: "#9aa7ff", note: "Asynchronous execution, queues, and batch motion." },
    data: { label: "Data", color: "#ff93bc", note: "Durable stores, indexes, and analytical persistence." }
  };

  const domainNames = Object.keys(domainMeta);

  const domainServiceNames = {
    frontend: ["edge-gateway", "web-frontend", "ops-console", "admin-shell", "mobile-edge", "ingress-proxy", "feature-hub", "marketing-site", "session-ui", "public-router"],
    auth: ["session-auth", "token-service", "identity-map", "policy-engine", "permission-sync", "key-broker", "trust-proxy", "auth-cache", "device-proof", "audit-sign"],
    core: ["api-core", "workflow-core", "ledger-core", "notify-core", "entitlement-core", "graph-core", "order-core", "orchestrator", "config-core", "command-core"],
    processors: ["event-processor", "job-runner", "scheduler", "queue-drain", "fanout-worker", "policy-worker", "reconcile-loop", "media-worker", "indexer", "batch-sweeper"],
    data: ["profile-store", "event-store", "analytics-warehouse", "cache-router", "vector-index", "document-store", "graph-store", "blob-store", "warehouse-sync", "query-index"]
  };

  const healthOverrides = {
    "policy-engine": "degraded",
    "graph-core": "degraded",
    "blob-store": "degraded",
    "notify-core": "critical",
    "cache-router": "critical"
  };

  const lifecycleOverrides = {
    "edge-gateway": "deploying",
    "session-auth": "deploying",
    "api-core": "deploying",
    "workflow-core": "deploying",
    "event-processor": "deploying",
    "event-store": "deploying",
    "session-ui": "rollback",
    "trust-proxy": "rollback",
    "job-runner": "scaling",
    "scheduler": "scaling",
    "media-worker": "scaling",
    "public-router": "scaling",
    "analytics-warehouse": "scaling",
    "warehouse-sync": "scaling"
  };

  const healthColors = {
    healthy: "#68f6c7",
    degraded: "#ffbf5f",
    critical: "#ff5d67"
  };

  const lifecycleLabels = {
    stable: "stable",
    deploying: "deploying",
    scaling: "scaling",
    rollback: "rollback"
  };

  const domainProfiles = {
    frontend: { latency: 24, traffic: 280, replicas: 4, cpu: 38, memory: 420 },
    auth: { latency: 30, traffic: 160, replicas: 3, cpu: 42, memory: 456 },
    core: { latency: 26, traffic: 220, replicas: 5, cpu: 47, memory: 520 },
    processors: { latency: 34, traffic: 180, replicas: 4, cpu: 53, memory: 610 },
    data: { latency: 22, traffic: 140, replicas: 3, cpu: 34, memory: 742 }
  };

  const cloudRunServices = new Set([
    "web-frontend",
    "ops-console",
    "admin-shell",
    "marketing-site",
    "session-ui",
    "session-auth",
    "token-service",
    "identity-map",
    "permission-sync",
    "trust-proxy",
    "auth-cache",
    "device-proof",
    "audit-sign",
    "profile-store",
    "document-store",
    "query-index"
  ]);

  function formatPercent(value) {
    return `${value.toFixed(1)}%`;
  }

  function formatMs(value) {
    return `${Math.round(value)} ms`;
  }

  function formatTraffic(value) {
    return `${Math.round(value)} rps`;
  }

  function formatMemory(value) {
    return `${Math.round(value)} MiB`;
  }

  function inferServiceType(label) {
    return cloudRunServices.has(label) ? "Cloud Run" : "GKE";
  }

  function buildService(domain, label, domainIndex, index) {
    const profile = domainProfiles[domain];
    const globalIndex = domainIndex * 10 + index;
    const health = healthOverrides[label] || (globalIndex % 23 === 0 ? "degraded" : "healthy");
    const lifecycle = lifecycleOverrides[label] || (globalIndex % 17 === 0 ? "deploying" : "stable");
    const replicasCurrent = profile.replicas + (index % 4);
    const replicasTarget = lifecycle === "scaling" ? replicasCurrent + 2 + (index % 2) : replicasCurrent;
    const latencyBase = profile.latency + index * 2 + domainIndex * 3;
    const trafficBase = profile.traffic + index * 16 + domainIndex * 12;
    const cpuBase = profile.cpu + (index % 5) * 6;
    const memoryBase = profile.memory + index * 24;
    const latency = health === "critical" ? latencyBase * 4.2 : health === "degraded" ? latencyBase * 2.3 : lifecycle === "deploying" ? latencyBase * 1.25 : latencyBase;
    const adjustedLatency = lifecycle === "rollback" ? latency * 1.12 : latency;
    const errorRate = health === "critical" ? 11.4 : health === "degraded" ? 2.6 : lifecycle === "rollback" ? 0.9 : lifecycle === "deploying" ? 0.6 : 0.2 + (index % 3) * 0.1;
    const traffic = lifecycle === "scaling" ? trafficBase * 1.18 : trafficBase;
    const cpu = health === "critical" ? 94 : health === "degraded" ? Math.min(88, cpuBase + 18) : lifecycle === "deploying" ? Math.min(82, cpuBase + 8) : cpuBase;
    const memory = health === "critical" ? memoryBase + 160 : health === "degraded" ? memoryBase + 90 : memoryBase;
    const isRollback = lifecycle === "rollback";

    return {
      id: label,
      label,
      domain,
      domainLabel: domainMeta[domain].label,
      health,
      lifecycle,
      latency: formatMs(adjustedLatency),
      errorRate: formatPercent(errorRate),
      traffic: formatTraffic(traffic),
      replicasCurrent,
      replicasTarget,
      replicasText: `${replicasCurrent}`,
      replicasHint: lifecycle === "scaling" ? "Scaling" : "",
      cpu: formatPercent(cpu),
      memory: formatMemory(memory),
      deploy: isRollback ? "traffic pinned to prior revision" : lifecycle === "deploying" ? "world rollout verifying" : lifecycle === "scaling" ? "capacity expanding" : health === "critical" ? "incident active" : health === "degraded" ? "watching regressions" : "stable",
      serviceType: inferServiceType(label),
      imageTag: isRollback ? world.previousImageTag : world.imageTag,
      imageShort: isRollback ? world.previousImageShort : world.imageShort,
      desiredImageTag: world.imageTag
    };
  }

  const services = domainNames.flatMap((domain, domainIndex) =>
    domainServiceNames[domain].map((label, index) => buildService(domain, label, domainIndex, index))
  );

  const servicesById = Object.fromEntries(services.map((service) => [service.id, service]));

  const groupedDomains = domainNames.map((domain) => {
    const domainServices = services.filter((service) => service.domain === domain);
    const degradedCount = domainServices.filter((service) => service.health === "degraded").length;
    const criticalCount = domainServices.filter((service) => service.health === "critical").length;
    const scalingCount = domainServices.filter((service) => service.lifecycle === "scaling").length;
    const deployingCount = domainServices.filter((service) => service.lifecycle === "deploying").length;
    const rollbackCount = domainServices.filter((service) => service.lifecycle === "rollback").length;
    return {
      id: domain,
      ...domainMeta[domain],
      services: domainServices,
      degradedCount,
      criticalCount,
      scalingCount,
      deployingCount,
      rollbackCount
    };
  });

  function serviceAccent(service) {
    return healthColors[service.health] || "#68f6c7";
  }

  function chip(text, className, color) {
    const style = color ? ` style="--domain-color:${color}"` : "";
    return `<span class="state-chip ${className || ""}"${style}>${text}</span>`;
  }

  function serviceRowMarkup(service) {
    return `
      <article class="service-row ${service.health} ${service.lifecycle}" data-service-id="${service.id}" style="--accent:${serviceAccent(service)}">
        <div class="service-cell">
          <span class="service-dot"></span>
          <div class="service-title">
            <div class="service-name">${service.label}</div>
            <div class="service-sub">${service.deploy}</div>
          </div>
        </div>
        <div>${chip(service.health, service.health)}</div>
        <div>${chip(lifecycleLabels[service.lifecycle], `lifecycle ${service.lifecycle}`)}</div>
        <div class="table-metric mono">${service.latency}</div>
        <div class="table-metric mono">${service.traffic}</div>
        <div class="replica-wrap">
          <span class="replica-indicator${service.lifecycle === "scaling" ? " scaling" : ""}"${service.replicasHint ? ` title="${service.replicasHint}" aria-label="${service.replicasHint}"` : ""}>${service.replicasCurrent}</span>
        </div>
        <div class="image-tag mono">${service.imageShort}</div>
      </article>
    `;
  }

  function tableHeaderMarkup() {
    return `
      <div class="table-header">
        <div>Service</div>
        <div>Health</div>
        <div>Mode</div>
        <div>Latency</div>
        <div>Traffic</div>
        <div>Replicas</div>
        <div>Image</div>
      </div>
    `;
  }

  function summaryCards(modeLabel) {
    return `
      <div class="summary-card">Mesh slice<strong>${world.slice}</strong></div>
      <div class="summary-card">World release<strong>${world.releaseVersion}</strong></div>
      <div class="summary-card">Image artifact<strong class="mono">${world.imageShort}</strong></div>
      <div class="summary-card">View mode<strong>${modeLabel}</strong></div>
      <div class="summary-card">Scale test<strong>${services.length} services / ${groupedDomains.length} domains</strong></div>
    `;
  }

  function focusPanelMarkup() {
    return `
      <aside class="focus-panel" aria-hidden="true">
        <div class="focus-header">
          <div>
            <h3 data-role="focus-name"></h3>
            <p data-role="focus-release"></p>
          </div>
          <button class="panel-close" type="button" aria-label="Close service panel">x</button>
        </div>
        <div class="state-chip-row">
          <span class="state-chip domain-chip" data-role="focus-domain"></span>
          <span class="state-chip" data-role="focus-health"></span>
          <span class="state-chip lifecycle" data-role="focus-mode"></span>
        </div>
        <div>
          <div class="focus-section-title">Current snapshot</div>
          <div class="focus-metrics">
            <div class="metric-row"><span>Release</span><strong class="mono" data-role="focus-image"></strong></div>
            <div class="metric-row"><span>Desired</span><strong class="mono" data-role="focus-desired-image"></strong></div>
            <div class="metric-row"><span>Type</span><strong class="mono" data-role="focus-type"></strong></div>
            <div class="metric-row"><span>Replicas</span><strong class="mono" data-role="focus-replicas"></strong></div>
            <div class="metric-row"><span>Traffic</span><strong class="mono" data-role="focus-traffic"></strong></div>
            <div class="metric-row"><span>Latency p95</span><strong class="mono" data-role="focus-latency"></strong></div>
            <div class="metric-row"><span>Error rate</span><strong class="mono" data-role="focus-error"></strong></div>
            <div class="metric-row"><span>CPU</span><strong class="mono" data-role="focus-cpu"></strong></div>
            <div class="metric-row"><span>Memory</span><strong class="mono" data-role="focus-memory"></strong></div>
            <div class="metric-row"><span>Deploy</span><strong class="mono" data-role="focus-deploy"></strong></div>
          </div>
        </div>
        <div class="focus-actions">
          <a class="action-link" href="https://google.com" target="_blank" rel="noreferrer">View Service</a>
          <button class="action-button" type="button">Logs</button>
          <button class="action-button" type="button">Traces</button>
          <button class="action-button" type="button">Metrics</button>
        </div>
      </aside>
    `;
  }

  function populatePanel(scene, service) {
    scene.classList.add("has-focus");
    scene.querySelector("[data-role='focus-name']").textContent = service.label;
    scene.querySelector("[data-role='focus-release']").textContent = `${world.releaseLabel} ${world.releaseVersion}`;
    const domainChip = scene.querySelector("[data-role='focus-domain']");
    domainChip.textContent = service.domainLabel;
    domainChip.style.setProperty("--domain-color", domainMeta[service.domain].color);
    const healthChip = scene.querySelector("[data-role='focus-health']");
    healthChip.textContent = service.health;
    healthChip.className = `state-chip ${service.health}`;
    const modeChip = scene.querySelector("[data-role='focus-mode']");
    modeChip.textContent = lifecycleLabels[service.lifecycle];
    modeChip.className = `state-chip lifecycle ${service.lifecycle}`;
    scene.querySelector("[data-role='focus-image']").textContent = service.imageTag;
    scene.querySelector("[data-role='focus-desired-image']").textContent = service.desiredImageTag;
    scene.querySelector("[data-role='focus-type']").textContent = service.serviceType;
    scene.querySelector("[data-role='focus-replicas']").textContent = service.replicasText;
    scene.querySelector("[data-role='focus-traffic']").textContent = service.traffic;
    scene.querySelector("[data-role='focus-latency']").textContent = service.latency;
    scene.querySelector("[data-role='focus-error']").textContent = service.errorRate;
    scene.querySelector("[data-role='focus-cpu']").textContent = service.cpu;
    scene.querySelector("[data-role='focus-memory']").textContent = service.memory;
    scene.querySelector("[data-role='focus-deploy']").textContent = service.deploy;
    scene.querySelectorAll(".service-row.is-active").forEach((row) => row.classList.remove("is-active"));
    scene.querySelectorAll(`[data-service-id='${service.id}']`).forEach((row) => row.classList.add("is-active"));
  }

  function clearPanel(scene) {
    scene.classList.remove("has-focus");
    scene.querySelectorAll(".service-row.is-active").forEach((row) => row.classList.remove("is-active"));
  }

  function attachPanel(scene) {
    scene.addEventListener("click", (event) => {
      if (event.target.closest(".panel-close")) {
        clearPanel(scene);
        return;
      }
      if (event.target.closest(".focus-panel")) return;
      const trigger = event.target.closest("[data-service-id]");
      if (trigger) {
        populatePanel(scene, servicesById[trigger.dataset.serviceId]);
        return;
      }
      clearPanel(scene);
    });
  }

  function domainHeaderMeta(domain) {
    return `
      <div class="domain-meta">
        ${chip(`${domain.services.length} services`, "", domain.color)}
        ${domain.degradedCount ? chip(`${domain.degradedCount} degraded`, "degraded") : ""}
        ${domain.criticalCount ? chip(`${domain.criticalCount} critical`, "critical") : ""}
        ${domain.scalingCount ? chip(`${domain.scalingCount} scaling`, "lifecycle scaling") : ""}
        ${domain.deployingCount ? chip(`${domain.deployingCount} rollout`, "lifecycle deploying") : ""}
        ${domain.rollbackCount ? chip(`${domain.rollbackCount} rollback`, "lifecycle rollback") : ""}
      </div>
    `;
  }

  global.FutureTableLab = {
    world,
    domainMeta,
    groupedDomains,
    services,
    servicesById,
    serviceAccent,
    chip,
    summaryCards,
    focusPanelMarkup,
    populatePanel,
    clearPanel,
    attachPanel,
    tableHeaderMarkup,
    serviceRowMarkup,
    domainHeaderMeta
  };
})(window);
