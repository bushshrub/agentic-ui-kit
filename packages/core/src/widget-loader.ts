/**
 * The frame page for `WidgetHost.frameUrl`. Serve this HTML from your own origin (e.g. at /widget-frame.html)
 * when your app's CSP blocks inline scripts: an `srcdoc` frame inherits the page's CSP, a frame loaded from
 * a URL gets the CSP of its own response. The kit loads it sandboxed (opaque origin, no access to your app),
 * posts the widget's document to it, and the loader writes it in. The kit's CSP <meta> inside that document
 * still limits what the widget may load.
 *
 * Its response needs a CSP that lets the loader and the widget run, and no stricter than the kit's, e.g.
 * `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src data: blob: https:; font-src data: https:; connect-src https:`
 * (or no CSP header on that path). Don't set X-Frame-Options or frame-ancestors that exclude your app.
 */

/** Message types between the kit and the loader. */
export const widgetLoaderMessages = {
  /** Loader → kit: ready for the document. */
  ready: "agentic-ui-kit:frame-ready",
  /** Kit → loader: `{ type, html }`, the widget's whole document. */
  document: "agentic-ui-kit:frame-document",
} as const;

export const widgetFrameLoader = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
addEventListener("message", function load(e) {
  if (e.source !== parent || !e.data || e.data.type !== "${widgetLoaderMessages.document}" || typeof e.data.html !== "string") return;
  removeEventListener("message", load);
  document.open(); document.write(e.data.html); document.close();
});
parent.postMessage({ type: "${widgetLoaderMessages.ready}" }, "*");
</script></body></html>
`;
