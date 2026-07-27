// new file

const { createProxyMiddleware } = require("http-proxy-middleware");

// Local dev replacement for the nginx routing used in production:

//   /api/*       -> hosted MinMod API (minmod-kg backend)
//   /dashboard/* -> locally running ta2-minmod-dashboard (Dash app)
module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "https://minmod.isi.edu",
      changeOrigin: true,
    })
  );

  app.use(
    "/dashboard",
    createProxyMiddleware({
      target: "http://localhost:8050",
      changeOrigin: true,
      ws: true,
    })
  );
};
