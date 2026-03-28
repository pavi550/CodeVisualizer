import * as path from "path";
import { initPythonLanguageService } from "../core/language-services/python";
import { initTypeScriptLanguageService } from "../core/language-services/typescript";
import { initJavaLanguageService } from "../core/language-services/java";
import { initCppLanguageService } from "../core/language-services/cpp";
import { initCLanguageService } from "../core/language-services/c";
import { initRustLanguageService } from "../core/language-services/rust";
import { initGoLanguageService } from "../core/language-services/go";

let initializedRoot: string | undefined;

function getLanguageWasmPath(
  projectRoot: string,
  languageFolder: string,
  wasmFileName: string
): string {
  return path.join(
    projectRoot,
    "src",
    "core",
    "language-services",
    languageFolder,
    wasmFileName
  );
}

export async function initStandaloneLanguageServices(
  projectRoot: string
): Promise<void> {
  const normalizedRoot = path.resolve(projectRoot);
  if (initializedRoot === normalizedRoot) {
    return;
  }

  initPythonLanguageService(
    getLanguageWasmPath(
      normalizedRoot,
      "python",
      "tree-sitter-python.wasm"
    )
  );
  initTypeScriptLanguageService(
    getLanguageWasmPath(
      normalizedRoot,
      "typescript",
      "tree-sitter-typescript.wasm"
    )
  );
  initJavaLanguageService(
    getLanguageWasmPath(normalizedRoot, "java", "tree-sitter-java.wasm")
  );
  await initCppLanguageService(
    getLanguageWasmPath(normalizedRoot, "cpp", "tree-sitter-cpp.wasm")
  );
  await initCLanguageService(
    getLanguageWasmPath(normalizedRoot, "c", "tree-sitter-c.wasm")
  );
  await initRustLanguageService(
    getLanguageWasmPath(normalizedRoot, "rust", "tree-sitter-rust.wasm")
  );
  await initGoLanguageService(
    getLanguageWasmPath(normalizedRoot, "go", "tree-sitter-go.wasm")
  );

  initializedRoot = normalizedRoot;
}
