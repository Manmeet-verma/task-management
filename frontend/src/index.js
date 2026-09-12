const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");
const { createServer } = require("http");
const next = require("next");

if (!existsSync(join(process.cwd(), ".next", "BUILD_ID"))) {
  console.log("> Production build not found, building...");
  const build = spawnSync(
    process.execPath,
    [join("node_modules", "next", "dist", "bin", "next"), "build"],
    { stdio: "inherit" }
  );
  if (build.status !== 0) {
    console.error("> Next.js build failed, exiting.");
    process.exit(build.status ?? 1);
  }
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });