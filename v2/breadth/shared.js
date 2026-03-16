(function initBreadthVis(global) {
  const services = [
    { id: "edge", label: "edge-gateway", health: "healthy", lifecycle: "deploying", domain: "frontend" },
    { id: "auth", label: "auth-service", health: "degraded", lifecycle: "stable", domain: "auth" },
    { id: "api", label: "api-core", health: "healthy", lifecycle: "stable", domain: "core" },
    { id: "billing", label: "billing-core", health: "healthy", lifecycle: "scaling", domain: "core" },
    { id: "events", label: "event-bus", health: "healthy", lifecycle: "stable", domain: "processors" },
    { id: "worker", label: "worker-fleet", health: "healthy", lifecycle: "stable", domain: "processors" },
    { id: "profile", label: "profile-store", health: "critical", lifecycle: "stable", domain: "data" },
    { id: "analytics", label: "analytics", health: "healthy", lifecycle: "stable", domain: "data" }
  ];

  const links = [
    ["edge", "auth"],
    ["edge", "api"],
    ["auth", "api"],
    ["api", "billing"],
    ["api", "events"],
    ["billing", "worker"],
    ["events", "worker"],
    ["api", "profile"],
    ["events", "analytics"],
    ["worker", "analytics"]
  ];

  const healthColors = {
    healthy: "#5effc9",
    degraded: "#ffbf5f",
    critical: "#ff5d67"
  };

  const lifecycleColors = {
    stable: "#89b9d4",
    deploying: "#74d8ff",
    scaling: "#c6f5ff"
  };

  function serviceMap() {
    return Object.fromEntries(services.map((service) => [service.id, service]));
  }

  function serviceAccent(service) {
    return healthColors[service.health] || "#e9f7ff";
  }

  function lifecycleAccent(service) {
    return lifecycleColors[service.lifecycle] || serviceAccent(service);
  }

  function svg(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function polar(cx, cy, radius, angleDeg) {
    const angle = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    };
  }

  function cardHeader(title, note) {
    return `
      <header class="page-header">
        <div>
          <div class="eyebrow">Breadth Prototype</div>
          <h1>${title}</h1>
          <p>${note}</p>
        </div>
        <a class="back-link" href="./index.html">All Prototypes</a>
      </header>
    `;
  }

  global.BreadthVis = {
    services,
    links,
    healthColors,
    lifecycleColors,
    serviceMap: serviceMap(),
    serviceAccent,
    lifecycleAccent,
    svg,
    polar,
    cardHeader
  };
})(window);
