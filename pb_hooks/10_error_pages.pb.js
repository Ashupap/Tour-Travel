// Branded 404 page for browser page requests.
//
// PocketBase's built-in pb_public static route owns the root wildcard (`/*`,
// registered after the hook routes) and answers missing files by falling back
// to /index.html with HTTP 200. A router middleware runs before the matched
// handler, so we stat the requested file first and answer with the branded
// 404 page when it does not exist.
//
// `c.pathParam("*")` is only set when the request actually fell through to
// the static wildcard route, so paths served by explicit hook routes
// (/agent/dashboard, /admin/dashboard, ...) and /api/* are left untouched.
$app.onBeforeServe().preAdd(function (e) {
  let fsys = $os.dirFS("pb_public");
  let cached404 = "";

  e.router.use(function (next) {
    return function (c) {
      try {
        let method = "";
        try { method = c.request().method || ""; } catch (err) {}

        if (method === "GET" || method === "HEAD") {
          let p = "";
          try { p = c.pathParam("*") || ""; } catch (err) { p = ""; }

          if (p.length > 1 && p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1);

          let skip = false;
          if (!p || p === "index.html") skip = true;
          else if (p.indexOf("_") === 0 || p.indexOf("api") === 0) skip = true;
          else if (p.indexOf("..") !== -1) skip = true;

          if (!skip) {
            let exists = true;
            try { fsys.stat(p); } catch (err) { exists = false; }
            if (!exists) {
              try { fsys.stat(p + "/index.html"); exists = true; } catch (err) {}
            }
            if (!exists) {
              let accept = "";
              try {
                let h = c.request().header;
                try { accept = String(h.get("accept") || ""); } catch (e1) {
                  try { accept = String(h["Accept"] || ""); } catch (e2) {}
                }
              } catch (err) {}

              let lastSeg = p.slice(p.lastIndexOf("/") + 1);
              let isAsset = lastSeg.indexOf(".") !== -1;
              let isHtmlNav = accept.indexOf("text/html") !== -1;

              if (isAsset && !isHtmlNav) {
                return c.json(404, { code: 404, message: "The requested resource wasn't found." });
              }

              if (!cached404) {
                // $os.readFile returns a byte Array; decode UTF-8 via
                // decodeURIComponent since goja has no TextDecoder.
                try {
                  let bytes = $os.readFile("pb_public/404.html");
                  let pct = "";
                  for (let i = 0; i < bytes.length; i++) {
                    let b = bytes[i];
                    pct += (b < 16 ? "%0" : "%") + b.toString(16).toUpperCase();
                  }
                  cached404 = decodeURIComponent(pct);
                } catch (err) { cached404 = ""; }
              }
              let html = cached404;
              if (!html) {
                html = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>404 — BharatYatra</title></head>" +
                  "<body style=\"font-family:sans-serif;background:#0b0d12;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column\">" +
                  "<div style=\"color:#f59e0b;font-size:56px;font-weight:900\">404</div>" +
                  "<p>This road doesn't exist</p><p><a style=\"color:#f59e0b\" href=\"/\">Back to Home</a></p></body></html>";
              }
              return c.html(404, html);
            }
          }
        }
      } catch (err) {}
      return next(c);
    };
  });
});
