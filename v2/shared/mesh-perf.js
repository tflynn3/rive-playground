(function initMeshPerf(global) {
  const DEFAULT_SAMPLE_INTERVAL = 500;
  const DEFAULT_CONSOLE_INTERVAL = 5000;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function percentile(values, point) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(point * sorted.length) - 1));
    return sorted[index];
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function pushSample(store, value, limit) {
    store.push(value);
    if (store.length > limit) store.splice(0, store.length - limit);
  }

  function createNumber(value, digits) {
    return Number.isFinite(value) ? value.toFixed(digits) : "--";
  }

  function createRate(now, timestamps, windowMs) {
    while (timestamps.length && now - timestamps[0] > windowMs) {
      timestamps.shift();
    }
    return timestamps.length / (windowMs / 1000);
  }

  class MeshPerfMonitor {
    constructor(options) {
      this.pageId = options.pageId || "mesh-scene";
      this.overlayEnabled = options.overlay !== false;
      this.consoleReporting = options.consoleReporting !== false;
      this.sampleIntervalMs = options.sampleIntervalMs || DEFAULT_SAMPLE_INTERVAL;
      this.consoleIntervalMs = options.consoleIntervalMs || DEFAULT_CONSOLE_INTERVAL;
      this.frameSamples = [];
      this.renderSamples = { full: [], interaction: [], camera: [], update: [] };
      this.hoverSamples = [];
      this.longTaskSamples = [];
      this.pendingHovers = new Map();
      this.telemetryTimestamps = [];
      this.mutationTimestamps = [];
      this.stats = {
        nodeCount: 0,
        visibleNodeCount: 0,
        domainCount: 0,
        riveInstanceCount: 0,
        lod: "normal",
        zoom: 1
      };
      this.lastConsoleAt = 0;
      this.lastSampleAt = 0;
      this.frameHandle = null;
      this.lastFrameAt = 0;
      this.overlay = null;
      this.overlayFields = {};
      this.observer = null;
    }

    start() {
      if (this.frameHandle) return;
      this.lastFrameAt = performance.now();
      this.lastSampleAt = this.lastFrameAt;
      if (this.overlayEnabled) {
        this.ensureOverlay();
      }
      this.startLongTaskObserver();
      const tick = (now) => {
        const frameMs = now - this.lastFrameAt;
        this.lastFrameAt = now;
        if (Number.isFinite(frameMs) && frameMs < 1000) {
          pushSample(this.frameSamples, frameMs, 240);
        }
        if (now - this.lastSampleAt >= this.sampleIntervalMs) {
          this.lastSampleAt = now;
          this.refresh(now);
        }
        this.frameHandle = global.requestAnimationFrame(tick);
      };
      this.frameHandle = global.requestAnimationFrame(tick);
      return this;
    }

    stop() {
      if (this.frameHandle) {
        global.cancelAnimationFrame(this.frameHandle);
        this.frameHandle = null;
      }
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    ensureOverlay() {
      if (this.overlay) return;
      const styleId = "mesh-perf-style";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .mesh-perf-overlay {
            position: fixed;
            right: 14px;
            bottom: 14px;
            z-index: 9999;
            width: min(320px, calc(100vw - 24px));
            padding: 12px 14px;
            border-radius: 16px;
            background: rgba(6, 15, 22, 0.94);
            border: 1px solid rgba(121, 237, 255, 0.16);
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
            color: #e4f5f0;
            font: 12px/1.45 Consolas, "SFMono-Regular", Menlo, monospace;
            pointer-events: none;
          }
          .mesh-perf-title {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
            color: #d9faff;
          }
          .mesh-perf-subtle {
            color: #88a7b6;
          }
          .mesh-perf-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 12px;
          }
          .mesh-perf-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }
          .mesh-perf-row span:first-child {
            color: #88a7b6;
          }
        `;
        document.head.appendChild(style);
      }

      this.overlay = document.createElement("aside");
      this.overlay.className = "mesh-perf-overlay";
      this.overlay.innerHTML = `
        <div class="mesh-perf-title">
          <strong>Perf</strong>
          <span class="mesh-perf-subtle" data-role="page"></span>
        </div>
        <div class="mesh-perf-grid">
          <div class="mesh-perf-row"><span>fps</span><strong data-role="fps"></strong></div>
          <div class="mesh-perf-row"><span>frame avg</span><strong data-role="frameAvg"></strong></div>
          <div class="mesh-perf-row"><span>frame p95</span><strong data-role="frameP95"></strong></div>
          <div class="mesh-perf-row"><span>render avg</span><strong data-role="renderAvg"></strong></div>
          <div class="mesh-perf-row"><span>render p95</span><strong data-role="renderP95"></strong></div>
          <div class="mesh-perf-row"><span>hover p95</span><strong data-role="hoverP95"></strong></div>
          <div class="mesh-perf-row"><span>long tasks</span><strong data-role="longTasks"></strong></div>
          <div class="mesh-perf-row"><span>heap</span><strong data-role="heap"></strong></div>
          <div class="mesh-perf-row"><span>nodes</span><strong data-role="nodes"></strong></div>
          <div class="mesh-perf-row"><span>domains</span><strong data-role="domains"></strong></div>
          <div class="mesh-perf-row"><span>updates/s</span><strong data-role="updates"></strong></div>
          <div class="mesh-perf-row"><span>mutations/s</span><strong data-role="mutations"></strong></div>
          <div class="mesh-perf-row"><span>lod</span><strong data-role="lod"></strong></div>
          <div class="mesh-perf-row"><span>zoom</span><strong data-role="zoom"></strong></div>
          <div class="mesh-perf-row"><span>rive</span><strong data-role="rive"></strong></div>
          <div class="mesh-perf-row"><span>visible</span><strong data-role="visible"></strong></div>
        </div>
      `;
      document.body.appendChild(this.overlay);
      this.overlayFields = Object.fromEntries(
        Array.from(this.overlay.querySelectorAll("[data-role]")).map((node) => [node.dataset.role, node])
      );
      this.overlayFields.page.textContent = this.pageId;
    }

    startLongTaskObserver() {
      if (typeof PerformanceObserver === "undefined") return;
      try {
        this.observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            pushSample(this.longTaskSamples, entry.duration, 60);
          });
        });
        this.observer.observe({ entryTypes: ["longtask"] });
      } catch (error) {
        this.observer = null;
      }
    }

    markHoverStart(id) {
      this.pendingHovers.set(id, performance.now());
    }

    markHoverVisible(id) {
      if (!this.pendingHovers.has(id)) return;
      const latency = performance.now() - this.pendingHovers.get(id);
      this.pendingHovers.delete(id);
      if (latency >= 0 && latency < 2000) {
        pushSample(this.hoverSamples, latency, 80);
      }
    }

    markMutation(type) {
      this.mutationTimestamps.push(performance.now());
      this.lastMutation = type;
    }

    markTelemetryUpdate() {
      this.telemetryTimestamps.push(performance.now());
    }

    markRenderStart(kind) {
      return { kind: kind || "update", startedAt: performance.now() };
    }

    markRenderEnd(token) {
      if (!token || !token.kind) return;
      const duration = performance.now() - token.startedAt;
      if (duration >= 0 && duration < 5000) {
        const bucket = this.renderSamples[token.kind] || this.renderSamples.update;
        pushSample(bucket, duration, 120);
      }
    }

    setNodeCount(n) {
      this.stats.nodeCount = n;
    }

    setVisibleNodeCount(n) {
      this.stats.visibleNodeCount = n;
    }

    setDomainCount(n) {
      this.stats.domainCount = n;
    }

    setRiveInstanceCount(n) {
      this.stats.riveInstanceCount = n;
    }

    setLod(lod) {
      this.stats.lod = lod;
    }

    setZoom(scale) {
      this.stats.zoom = scale;
    }

    getSnapshot() {
      const now = performance.now();
      const frameAvg = average(this.frameSamples);
      const frameP95 = percentile(this.frameSamples, 0.95);
      const renderSeries = [
        ...this.renderSamples.full,
        ...this.renderSamples.interaction,
        ...this.renderSamples.camera
      ];
      const renderAvg = average(renderSeries);
      const renderP95 = percentile(renderSeries, 0.95);
      const hoverAvg = average(this.hoverSamples);
      const hoverP95 = percentile(this.hoverSamples, 0.95);
      const updatesPerSec = createRate(now, this.telemetryTimestamps, 5000);
      const mutationsPerSec = createRate(now, this.mutationTimestamps, 5000);
      const fps = frameAvg > 0 ? 1000 / frameAvg : 0;
      const heapUsed = global.performance && global.performance.memory
        ? global.performance.memory.usedJSHeapSize / (1024 * 1024)
        : null;
      return {
        pageId: this.pageId,
        fps,
        frameAvg,
        frameP95,
        renderAvg,
        renderP95,
        hoverAvg,
        hoverP95,
        longTaskCount: this.longTaskSamples.length,
        longTaskTotal: this.longTaskSamples.reduce((sum, value) => sum + value, 0),
        heapUsedMb: heapUsed,
        updatesPerSec,
        mutationsPerSec,
        nodeCount: this.stats.nodeCount,
        visibleNodeCount: this.stats.visibleNodeCount,
        domainCount: this.stats.domainCount,
        riveInstanceCount: this.stats.riveInstanceCount,
        lod: this.stats.lod,
        zoom: this.stats.zoom
      };
    }

    refresh(now) {
      const snapshot = this.getSnapshot();
      if (this.overlayFields.fps) {
        this.overlayFields.fps.textContent = createNumber(snapshot.fps, 0);
        this.overlayFields.frameAvg.textContent = `${createNumber(snapshot.frameAvg, 1)} ms`;
        this.overlayFields.frameP95.textContent = `${createNumber(snapshot.frameP95, 1)} ms`;
        this.overlayFields.renderAvg.textContent = `${createNumber(snapshot.renderAvg, 1)} ms`;
        this.overlayFields.renderP95.textContent = `${createNumber(snapshot.renderP95, 1)} ms`;
        this.overlayFields.hoverP95.textContent = `${createNumber(snapshot.hoverP95, 1)} ms`;
        this.overlayFields.longTasks.textContent = `${snapshot.longTaskCount} / ${createNumber(snapshot.longTaskTotal, 0)} ms`;
        this.overlayFields.heap.textContent = snapshot.heapUsedMb == null ? "--" : `${createNumber(snapshot.heapUsedMb, 1)} MiB`;
        this.overlayFields.nodes.textContent = String(snapshot.nodeCount);
        this.overlayFields.visible.textContent = String(snapshot.visibleNodeCount);
        this.overlayFields.domains.textContent = String(snapshot.domainCount);
        this.overlayFields.updates.textContent = createNumber(snapshot.updatesPerSec, 1);
        this.overlayFields.mutations.textContent = createNumber(snapshot.mutationsPerSec, 1);
        this.overlayFields.lod.textContent = snapshot.lod;
        this.overlayFields.zoom.textContent = `${Math.round(snapshot.zoom * 100)}%`;
        this.overlayFields.rive.textContent = String(snapshot.riveInstanceCount);
      }

      if (this.consoleReporting && now - this.lastConsoleAt >= this.consoleIntervalMs) {
        this.lastConsoleAt = now;
        console.table([{
          page: snapshot.pageId,
          fps: Number(createNumber(snapshot.fps, 0)),
          frameAvgMs: Number(createNumber(snapshot.frameAvg, 1)),
          frameP95Ms: Number(createNumber(snapshot.frameP95, 1)),
          renderAvgMs: Number(createNumber(snapshot.renderAvg, 1)),
          renderP95Ms: Number(createNumber(snapshot.renderP95, 1)),
          hoverP95Ms: Number(createNumber(snapshot.hoverP95, 1)),
          longTasks: snapshot.longTaskCount,
          heapUsedMb: snapshot.heapUsedMb == null ? null : Number(createNumber(snapshot.heapUsedMb, 1)),
          nodeCount: snapshot.nodeCount,
          visibleNodeCount: snapshot.visibleNodeCount,
          domainCount: snapshot.domainCount,
          updatesPerSec: Number(createNumber(snapshot.updatesPerSec, 1)),
          mutationsPerSec: Number(createNumber(snapshot.mutationsPerSec, 1)),
          lod: snapshot.lod,
          zoom: Number(createNumber(snapshot.zoom, 2)),
          riveInstanceCount: snapshot.riveInstanceCount
        }]);
      }
    }
  }

  global.MeshPerf = {
    createMeshPerfMonitor(options) {
      return new MeshPerfMonitor(options || {});
    }
  };
})(window);
