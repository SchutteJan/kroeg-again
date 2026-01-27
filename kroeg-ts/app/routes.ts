import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("map", "routes/map.tsx"),
  route("list", "routes/list.tsx"),
  route("location/:id", "routes/location.$id.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("admin", "routes/admin._index.tsx"),
  route("admin/pending", "routes/admin.pending.tsx"),
  route("admin/locations", "routes/admin.locations.tsx"),
  route("admin/licenses", "routes/admin.licenses.tsx"),
  route("api/curation/uncurated", "routes/api/curation.uncurated.ts"),
  route("api/curation/decide", "routes/api/curation.decide.ts"),
  route("api/curation/stats", "routes/api/curation.stats.ts"),
  route("api/curation/pending", "routes/api/curation.pending.ts"),
  route("api/curation/verify", "routes/api/curation.verify.ts"),
  route("api/licenses/sync", "routes/api/licenses.sync.ts"),
  route("api/licenses/search", "routes/api/licenses.search.ts"),
  route("api/auth/*", "routes/api/auth.ts"),
] satisfies RouteConfig;
