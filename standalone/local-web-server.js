const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");

const projectRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(__dirname, "public");
const defaultPort = Number(process.env.CODEVISUALIZER_WEB_PORT || 3210);
const host = process.env.CODEVISUALIZER_WEB_HOST || "127.0.0.1";

function detectLanguageId(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp",
    ".cxx": "cpp",
    ".cc": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".rs": "rust",
    ".go": "go",
  };
  return map[ext];
}

function normalizeInsideWorkspace(requestedPath) {
  if (!requestedPath) {
    throw new Error("Missing path parameter.");
  }

  const candidate = path.isAbsolute(requestedPath)
    ? path.normalize(requestedPath)
    : path.resolve(projectRoot, requestedPath);
  const relative = path.relative(projectRoot, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Requested path must stay inside the repository workspace.");
  }

  return candidate;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendText(res, 404, "Not found", "text/plain");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".html"
      ? "text/html"
      : ext === ".js"
        ? "application/javascript"
        : ext === ".css"
          ? "text/css"
          : "text/plain";

  sendText(res, 200, fs.readFileSync(filePath, "utf8"), contentType);
}

function isMissingTargetFlowchart(ir) {
  return (
    ir &&
    Array.isArray(ir.nodes) &&
    ir.nodes.length === 1 &&
    ir.nodes[0] &&
    typeof ir.nodes[0].label === "string" &&
    ir.nodes[0].label.includes("Place cursor inside")
  );
}

async function createServer() {
  const {
    analyzeCode,
    listAvailableFunctions,
  } = require(path.join(projectRoot, "out", "core", "analyzer.js"));
  const {
    EnhancedMermaidGenerator,
  } = require(path.join(projectRoot, "out", "core", "EnhancedMermaidGenerator.js"));
  const {
    CodebaseAnalyzer,
  } = require(path.join(projectRoot, "out", "core", "dependency", "CodebaseAnalyzer.js"));
  const {
    CodebaseGraphBuilder,
  } = require(path.join(projectRoot, "out", "core", "dependency", "CodebaseGraphBuilder.js"));
  const {
    initStandaloneLanguageServices,
  } = require(path.join(projectRoot, "out", "standalone", "initStandaloneLanguageServices.js"));

  await initStandaloneLanguageServices(projectRoot);

  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host || `${host}:${defaultPort}`}`);

      if (requestUrl.pathname === "/api/health") {
        sendJson(res, 200, {
          ok: true,
          projectRoot,
          viewerUrl: `http://${host}:${defaultPort}/`,
        });
        return;
      }

      if (requestUrl.pathname === "/api/flowchart") {
        const body = req.method === "POST" ? await readJsonBody(req) : {};
        const requestedPath = body.path || requestUrl.searchParams.get("path");
        const requestedLanguage =
          body.language || requestUrl.searchParams.get("language");
        const requestedFunction =
          body.functionName || requestUrl.searchParams.get("functionName") || undefined;
        const requestedCode = body.code;
        const requestedPosition =
          body.position ?? requestUrl.searchParams.get("position");
        const requestedTheme =
          body.theme || requestUrl.searchParams.get("theme") || "monokai";
        const requestedAppearance =
          body.appearance || requestUrl.searchParams.get("appearance") || "dark";

        let sourceCode = requestedCode;
        let resolvedPath = requestedPath ? normalizeInsideWorkspace(requestedPath) : undefined;

        if (!sourceCode) {
          if (!resolvedPath) {
            throw new Error("Provide either a file path or raw code.");
          }
          sourceCode = fs.readFileSync(resolvedPath, "utf8");
        }

        const languageId =
          requestedLanguage || (resolvedPath ? detectLanguageId(resolvedPath) : undefined);
        if (!languageId) {
          throw new Error("Unable to detect language. Pass the language query parameter.");
        }

        const numericPosition =
          requestedPosition === undefined || requestedPosition === null || requestedPosition === ""
            ? undefined
            : Number(requestedPosition);

        if (
          numericPosition !== undefined &&
          (Number.isNaN(numericPosition) || numericPosition < 0)
        ) {
          throw new Error("position must be a non-negative number.");
        }

        let ir = await analyzeCode(
          sourceCode,
          languageId,
          requestedFunction,
          numericPosition
        );

        // Uploaded/raw code often should fall back to the first function if a stale
        // cursor offset is provided and does not land inside a function.
        if (
          requestedCode &&
          !requestedFunction &&
          numericPosition !== undefined &&
          isMissingTargetFlowchart(ir)
        ) {
          ir = await analyzeCode(sourceCode, languageId, undefined, undefined);
        }

        const generator = new EnhancedMermaidGenerator(
          requestedTheme,
          requestedAppearance === "light" ? "light" : "dark"
        );
        const mermaid = generator.generate(ir);

        sendJson(res, 200, {
          ok: true,
          mode: "flowchart",
          language: languageId,
          path: resolvedPath ? path.relative(projectRoot, resolvedPath) : null,
          functionName: requestedFunction || null,
          position: numericPosition ?? null,
          mermaid,
          title: ir.title || "Code Flowchart",
          locationMap: ir.locationMap,
        });
        return;
      }

      if (requestUrl.pathname === "/api/functions") {
        const body = req.method === "POST" ? await readJsonBody(req) : {};
        const requestedPath = body.path || requestUrl.searchParams.get("path");
        const requestedLanguage =
          body.language || requestUrl.searchParams.get("language");
        const requestedCode = body.code;

        let sourceCode = requestedCode;
        let resolvedPath = requestedPath ? normalizeInsideWorkspace(requestedPath) : undefined;

        if (!sourceCode) {
          if (!resolvedPath) {
            throw new Error("Provide either a file path or raw code.");
          }
          sourceCode = fs.readFileSync(resolvedPath, "utf8");
        }

        const languageId =
          requestedLanguage || (resolvedPath ? detectLanguageId(resolvedPath) : undefined);
        if (!languageId) {
          throw new Error("Unable to detect language. Pass the language query parameter.");
        }

        const functions = await listAvailableFunctions(sourceCode, languageId);
        sendJson(res, 200, {
          ok: true,
          language: languageId,
          path: resolvedPath ? path.relative(projectRoot, resolvedPath) : null,
          functions,
        });
        return;
      }

      if (requestUrl.pathname === "/api/codebase") {
        const requestedPath = requestUrl.searchParams.get("path") || ".";
        const resolvedPath = normalizeInsideWorkspace(requestedPath);
        const stats = fs.statSync(resolvedPath);
        const selectedPaths = [resolvedPath];
        const analyzer = new CodebaseAnalyzer(projectRoot);
        const modules = await analyzer.analyzeCodebase(selectedPaths);
        const builder = new CodebaseGraphBuilder(modules, projectRoot);

        sendJson(res, 200, {
          ok: true,
          mode: "codebase",
          path: path.relative(projectRoot, resolvedPath),
          targetType: stats.isDirectory() ? "directory" : "file",
          mermaid: builder.generateMermaid(),
          title: `Codebase Flow: ${path.basename(resolvedPath)}`,
        });
        return;
      }

      if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
        serveStaticFile(res, path.join(publicRoot, "index.html"));
        return;
      }

      if (requestUrl.pathname === "/app.js") {
        serveStaticFile(res, path.join(publicRoot, "app.js"));
        return;
      }

      sendText(res, 404, "Not found", "text/plain");
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

async function main() {
  const server = await createServer();
  server.listen(defaultPort, host, () => {
    console.log(`CodeVisualizer local viewer running at http://${host}:${defaultPort}/`);
  });
}

main().catch((error) => {
  console.error("Failed to start local viewer:", error);
  process.exitCode = 1;
});
