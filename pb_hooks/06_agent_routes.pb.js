// pb_hooks/06_agent_routes.pb.js
// Custom route mapping /agent/dashboard to the Agent PWA shell

routerAdd("GET", "/agent/dashboard", (c) => {
  return c.redirect(302, "/agent/index.html");
});
