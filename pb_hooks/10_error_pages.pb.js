// pb_hooks/10_error_pages.pb.js
// Branded 404 page for missing page navigation routes.

$app.onBeforeServe().preAdd(function (e) {
  let cached404 = "";
  try {
    let bytes = $os.readFile("pb_public/404.html");
    let pct = "";
    for (let i = 0; i < bytes.length; i++) {
      let b = bytes[i];
      pct += (b < 16 ? "%0" : "%") + b.toString(16).toUpperCase();
    }
    cached404 = decodeURIComponent(pct);
  } catch (err) {
    cached404 = "";
  }

  if (!cached404) {
    cached404 = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>404 — BharatYatra</title></head>" +
      "<body style=\"font-family:sans-serif;background:#0b0d12;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column\">" +
      "<div style=\"color:#f59e0b;font-size:56px;font-weight:900\">404</div>" +
      "<p>This road doesn't exist</p><p><a style=\"color:#f59e0b\" href=\"/\">Back to Home</a></p></body></html>";
  }

  let fsys = $os.dirFS("pb_public");

  e.router.use(function (next) {
    return function (c) {
      let is404Target = false;
      try {
        let method = "";
        try { method = c.request().method || ""; } catch (err) {}

        if (method === "GET" || method === "HEAD") {
          let p = "";
          try { p = c.pathParam("*") || ""; } catch (err) { p = ""; }

          // Strip query strings and hash fragments
          let qIdx = p.indexOf("?");
          if (qIdx !== -1) p = p.slice(0, qIdx);
          let hIdx = p.indexOf("#");
          if (hIdx !== -1) p = p.slice(0, hIdx);

          while (p.length > 0 && p.charCodeAt(0) === 47) p = p.slice(1);
          while (p.length > 0 && p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1);

          // Fast path: skip root, pb_public root index, api, admin, or empty
          if (p && p !== "index.html" && p.indexOf("_") !== 0 && p.indexOf("api") !== 0 && p.indexOf("..") === -1) {
            let lastSlash = p.lastIndexOf("/");
            let lastSeg = lastSlash === -1 ? p : p.slice(lastSlash + 1);
            if (lastSeg.indexOf(".") === -1) {
              let dirExists = false;
              try {
                fsys.stat(p + "/index.html");
                dirExists = true;
              } catch (err) {}

              if (!dirExists) {
                is404Target = true;
              }
            }
          }
        }
      } catch (err) {}

      if (is404Target) {
        return c.html(404, cached404);
      }

      return next(c);
    };
  });
});
