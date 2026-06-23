"use client";

import * as React from "react";
import { FileCode, Loader2, X } from "lucide-react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useWorkspace } from "@/features/workspace/store";
import { languageFromPath } from "@/features/webcontainer/files";
import { cn } from "@/lib/utils";

const DARK_THEME = "webflowai-dark";
const LIGHT_THEME = "webflowai-light";

/**
 * VS Code-grade editor powered by Monaco (the same engine that runs VS Code).
 * Provides real multi-language syntax highlighting, bracket matching, and
 * minimap. Monaco is loaded lazily on the client so it never bloats the rest
 * of the app bundle. Themes are defined to match the app's warm palette and
 * follow the active light/dark theme.
 */
export function CodeEditor() {
  const activeFilePath = useWorkspace((s) => s.activeFilePath);
  const files = useWorkspace((s) => s.files);
  const writeFile = useWorkspace((s) => s.writeFile);
  const deleteFile = useWorkspace((s) => s.deleteFile);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Register the custom themes before the editor mounts.
  const handleBeforeMount: BeforeMount = (monaco) => {
    // Monaco's built-in TS/JS language service doesn't have the project's
    // tsconfig, node_modules, or React types, so it would flag every import
    // and JSX tag as an error (false positives). This is an editing surface,
    // not a full IDE — real type-checking happens at build time and in the
    // WebContainer. Disable diagnostics so the code isn't covered in red
    // squiggles; syntax highlighting (tokenization) is unaffected.
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;
    for (const defaults of [tsDefaults, jsDefaults]) {
      defaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });
      defaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        allowNonTsExtensions: true,
        allowJs: true,
        target: monaco.languages.typescript.ScriptTarget.Latest,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        esModuleInterop: true,
      });
    }

    monaco.editor.defineTheme(DARK_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d0c0b",
        "editor.foreground": "#e8e3da",
        "editorLineNumber.foreground": "#5c554c",
        "editorLineNumber.activeForeground": "#b8895e",
        "editor.selectionBackground": "#3a352e",
        "editor.lineHighlightBackground": "#1a1714",
        "editorCursor.foreground": "#fbe2a7",
        "editorIndentGuide.background1": "#26221d",
        "editorGutter.background": "#0d0c0b",
      },
    });
    monaco.editor.defineTheme(LIGHT_THEME, {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#fbfaf8",
        "editor.foreground": "#1c1610",
        "editorLineNumber.foreground": "#b8ae9f",
        "editorLineNumber.activeForeground": "#8a5a2b",
        "editor.lineHighlightBackground": "#f1ede6",
        "editorCursor.foreground": "#8a5a2b",
        "editorGutter.background": "#fbfaf8",
      },
    });
  };

  const handleMount: OnMount = (editor) => {
    editor.focus();
  };

  if (!activeFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <FileCode className="h-10 w-10 opacity-30" />
        <p className="mt-3 text-sm">Select a file to view its contents</p>
      </div>
    );
  }

  const content = files[activeFilePath] ?? "";
  const language = languageFromPath(activeFilePath);

  return (
    <div className="flex h-full flex-col bg-background/40">
      {/* Tabs */}
      <div className="flex h-10 shrink-0 items-center border-b border-border bg-card/20">
        <div className="flex h-full items-center gap-2 border-r border-border bg-background/60 px-3 text-xs text-foreground">
          <FileCode className="h-3.5 w-3.5 text-primary/70" />
          <span>{activeFilePath.split("/").pop()}</span>
          <button
            onClick={() => deleteFile(activeFilePath)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close tab"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <span className="ml-auto px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
      </div>

      {/* Monaco editor */}
      <div className="relative flex-1 overflow-hidden">
        <Editor
          path={activeFilePath}
          language={language}
          value={content}
          theme={isLight ? LIGHT_THEME : DARK_THEME}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={(value) => writeFile(activeFilePath, value ?? "")}
          loading={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          }
          options={{
            fontSize: 13,
            lineHeight: 20,
            fontFamily:
              "var(--font-mono), ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: true, renderCharacters: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            roundedSelection: true,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
          }}
        />
      </div>
    </div>
  );
}
