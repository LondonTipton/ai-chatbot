/**
 * Script to replace console.log/error/warn with safe logger
 * Run with: pnpm tsx scripts/replace-console-logs.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import path from "path";

const filesToProcess = [
  "middleware.ts",
  "components/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
  "app/**/*.{ts,tsx}",
  "!app/**/ui/**", // Exclude shadcn/ui components
  "!**/node_modules/**",
  "!**/.next/**",
];

async function replaceConsoleLogs() {
  console.log("🔍 Finding files to process...\n");

  const files = await glob(filesToProcess, {
    ignore: ["node_modules/**", ".next/**", "**/ui/**"],
  });

  let totalReplacements = 0;
  let filesModified = 0;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    let modified = content;
    let fileReplacements = 0;

    // Check if file already imports from logger
    const hasLoggerImport = /from ['"]@\/lib\/logger['"]/.test(content);

    // Count console usage
    const consoleMatches = content.match(
      /console\.(log|error|warn|info|debug)/g
    );

    if (!consoleMatches || consoleMatches.length === 0) {
      continue; // Skip files without console usage
    }

    // Replace console.log with logger.log
    modified = modified.replace(/console\.log\(/g, () => {
      fileReplacements++;
      return "logger.log(";
    });

    // Replace console.error with logger.error
    modified = modified.replace(/console\.error\(/g, () => {
      fileReplacements++;
      return "logger.error(";
    });

    // Replace console.warn with logger.warn
    modified = modified.replace(/console\.warn\(/g, () => {
      fileReplacements++;
      return "logger.warn(";
    });

    // Replace console.info with logger.info
    modified = modified.replace(/console\.info\(/g, () => {
      fileReplacements++;
      return "logger.info(";
    });

    // Replace console.debug with logger.debug
    modified = modified.replace(/console\.debug\(/g, () => {
      fileReplacements++;
      return "logger.debug(";
    });

    if (fileReplacements > 0) {
      // Add import if not present
      if (!hasLoggerImport) {
        // Find the last import statement
        const importRegex = /^import .+ from .+;$/gm;
        const imports = modified.match(importRegex);

        if (imports && imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const lastImportIndex = modified.lastIndexOf(lastImport);
          const insertPosition = lastImportIndex + lastImport.length;

          modified =
            modified.slice(0, insertPosition) +
            '\nimport { createLogger } from "@/lib/logger";\n\nconst logger = createLogger("' +
            getLoggerNamespace(file) +
            '");' +
            modified.slice(insertPosition);
        } else {
          // No imports found, add at the top (after "use client" if present)
          const useClientMatch = modified.match(
            /^["']use (client|server)["'];?\s*/m
          );
          if (useClientMatch) {
            const insertPosition =
              useClientMatch.index! + useClientMatch[0].length;
            modified =
              modified.slice(0, insertPosition) +
              '\nimport { createLogger } from "@/lib/logger";\n\nconst logger = createLogger("' +
              getLoggerNamespace(file) +
              '");\n' +
              modified.slice(insertPosition);
          } else {
            modified =
              'import { createLogger } from "@/lib/logger";\n\nconst logger = createLogger("' +
              getLoggerNamespace(file) +
              '");\n\n' +
              modified;
          }
        }
      }

      writeFileSync(file, modified, "utf-8");
      console.log(`✅ ${file} (${fileReplacements} replacements)`);
      totalReplacements += fileReplacements;
      filesModified++;
    }
  }

  console.log(
    `\n✨ Done! Modified ${filesModified} files with ${totalReplacements} replacements.`
  );
}

function getLoggerNamespace(filePath: string): string {
  // Convert file path to a readable namespace
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Remove file extension
  const fileName = parts[parts.length - 1].replace(/\.(ts|tsx)$/, "");

  // Get parent directory if meaningful
  if (parts.length > 1) {
    const parent = parts[parts.length - 2];
    if (parent !== "app" && parent !== "components" && parent !== "lib") {
      return `${parent}/${fileName}`;
    }
  }

  return fileName;
}

replaceConsoleLogs().catch(console.error);
