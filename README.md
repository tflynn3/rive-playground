# Rive Playground

Standalone HTML artifacts for exploring animated service-mesh visuals for Nucleus.

## Current Version

Use [`v2/core-gravity-adaptive-artifact.html`](./v2/core-gravity-adaptive-artifact.html) as the canonical reusable artifact.

Current featured exploration:

- [`v2/breadth/16-future-table-terminal-deck.html`](./v2/breadth/16-future-table-terminal-deck.html): grouped domain sub-tables with Cloud Run vs GKE, rollout and rollback states, shared image release tags, and a constellation-style right detail panel

What `v2` standardizes:

- adaptive core-gravity constellation layout
- fit-to-view camera with manual zoom controls
- lighter ambient motion and lower-cost disclosure patterns
- local performance overlay and structured console perf reporting
- domain-aware hover/focus behavior
- supporting stress harness for growth and performance validation, including scale-test controls

Primary files:

- [`v2/core-gravity-adaptive-artifact.html`](./v2/core-gravity-adaptive-artifact.html): polished reusable artifact
- [`v2/core-gravity-dynamic-test.html`](./v2/core-gravity-dynamic-test.html): mutation and stress harness
- [`v2/domain-constellation-exploration.html`](./v2/domain-constellation-exploration.html): finalized domain constellation direction
- [`v2/multi-service-exploration.html`](./v2/multi-service-exploration.html): optimized multi-service comparison artifact
- [`v2/service-cell-exploration.html`](./v2/service-cell-exploration.html): optimized single-service exploration

The canonical artifact continues to expose:

```js
window.CoreGravityAdaptiveArtifact.mount(root)
```

## Archive

The original flat artifact set is preserved under [`v1/`](./v1/README.md) as a historical snapshot of the exploration path.

## Entry Points

- [`index.html`](./index.html): forwards to the canonical `v2` adaptive artifact
- [`v2/index.html`](./v2/index.html): lightweight catalog of the current artifact set
- [`v2/breadth/index.html`](./v2/breadth/index.html): broader style exploration catalog, featuring `Future Table / Terminal Deck`

## Machine Benchmark

Run the dynamic harness headlessly from the repo root:

```bash
npm run scale:test
```

Optional flags:

```bash
npm run scale:test -- --targets=50,100,150,200 --dwellMs=800 --minFps=30
```
