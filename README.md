# Rive Playground

Standalone HTML artifacts for exploring animated service-mesh visuals for Nucleus.

## Primary Artifact

Use [core-gravity-adaptive-artifact.html](./core-gravity-adaptive-artifact.html) as the reusable, polished artifact.

What it includes:

- adaptive core-gravity constellation layout
- domain-aware organic hulls
- fit-to-view camera with manual zoom controls
- progressive disclosure for domain and service hover
- connected-service highlighting
- runtime mutation controls for host-app validation

It also exposes a small browser hook:

```js
window.CoreGravityAdaptiveArtifact.mount(root)
```

## Supporting Artifacts

- [core-gravity-dynamic-test.html](./core-gravity-dynamic-test.html): stress harness for growth and performance testing
- [domain-constellation-exploration.html](./domain-constellation-exploration.html): domain-grouped constellation exploration
- [multi-service-exploration.html](./multi-service-exploration.html): early multi-service layout comparisons
- [service-cell-exploration.html](./service-cell-exploration.html): single-service visual language exploration

## Usage

Open the HTML files directly in a browser, or serve the folder statically from any host.

If you want a single entrypoint, use [index.html](./index.html), which forwards to the adaptive artifact.
