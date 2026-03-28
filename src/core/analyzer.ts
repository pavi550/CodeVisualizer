import { FlowchartIR } from "../ir/ir";
import {
  analyzePythonCode,
  listPythonFunctions,
} from "./language-services/python";
import {
  analyzeTypeScriptCode,
  listTypeScriptFunctions,
} from "./language-services/typescript";
import { analyzeJavaCode, listJavaFunctions } from "./language-services/java";
import {
  analyzeCppCode,
  listCppFunctions,
} from "./language-services/cpp";
import { analyzeCCode, listCFunctions } from "./language-services/c";
import {
  analyzeRustCode,
  listRustFunctions,
} from "./language-services/rust";
import { analyzeGoCode, listGoFunctions } from "./language-services/go";

/**
 * Analyzes the given source code and generates a flowchart.
 * @param sourceCode - The source code to analyze.
 * @param languageId - The language identifier (e.g., 'python', 'typescript', etc.).
 * @param functionName - Optional function name to analyze specifically.
 * @param position - Optional position in the source code to analyze.
 * @returns A FlowchartIR representation of the code.
 */
export async function analyzeCode(
  sourceCode: string,
  languageId: string,
  functionName?: string,
  position?: number
): Promise<FlowchartIR> {
  switch (languageId) {
    case "python":
      return await analyzePythonCode(sourceCode, position);
    case "typescript":
    case "javascript":
      return await analyzeTypeScriptCode(sourceCode, position);
    case "java":
      return await analyzeJavaCode(sourceCode, position);
    case "cpp":
      return analyzeCppCode(sourceCode, functionName, position);
    case "c":
      return analyzeCCode(sourceCode, functionName, position);
    case "rust":
      return analyzeRustCode(sourceCode, functionName, position);
    case "go":
      return analyzeGoCode(sourceCode, functionName, position);
    default:
      throw new Error(`Unsupported language: ${languageId}`);
  }
}

export async function listAvailableFunctions(
  sourceCode: string,
  languageId: string
): Promise<string[]> {
  switch (languageId) {
    case "python":
      return await listPythonFunctions(sourceCode);
    case "typescript":
    case "javascript":
      return await listTypeScriptFunctions(sourceCode);
    case "java":
      return await listJavaFunctions(sourceCode);
    case "cpp":
      return listCppFunctions(sourceCode);
    case "c":
      return listCFunctions(sourceCode);
    case "rust":
      return listRustFunctions(sourceCode);
    case "go":
      return listGoFunctions(sourceCode);
    default:
      throw new Error(`Unsupported language: ${languageId}`);
  }
}
