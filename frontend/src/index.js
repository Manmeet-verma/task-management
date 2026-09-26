const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");
const { createServer } = require("http");
const next = require("next");

const dir = join(__dirname, "..");
const isDev = process.env.NODE_ENV === "development";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

if (!existsSync(join(dir, ".next", "BUILD_ID"))) {
  console.log("> No .next build found. Building now (slow, may exceed the host startup timeout). For fast startup, run `npm run build` locally and upload the .next folder.");
  const build = spawnSync(
    process.execPath,
    [join(dir, "node_modules", "next", "dist", "bin", "next"), "build"],
    { cwd: dir, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } }
  );
  if (build.status !== 0) {
    console.error("> Next.js build failed. Run `npm run build` locally and upload the .next folder.");
    process.exit(build.status ?? 1);
  }
}

const app = next({ dev: isDev, dir, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => handle(req, res));
    server.keepAliveTimeout = 65000;
    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port} (${isDev ? "development" : "production"})`);
    });
    for (const signal of ["SIGTERM", "SIGINT"]) {
      process.on(signal, () => server.close(() => process.exit(0)));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
