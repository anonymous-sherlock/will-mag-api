import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "..", "dist", "src");

function appendIndexIfDirectory(importPath: string, fileDir: string): string {
  if (importPath.endsWith(".js"))
    return importPath;

  const resolvedPath = path.resolve(fileDir, importPath);
  try {
    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return `${importPath}/index.js`;
    }
  } catch {
    // if path doesn't exist, ignore
  }
  return importPath;
}

function fixImportsInFile(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    const dirName = path.dirname(filePath);

    // Replace @/generated
    if (content.includes("@/generated")) {
      const relativePath = path
        .relative(dirName, path.join(distDir, "generated"))
        .replace(/\\/g, "/");

      content = content.replace(/@\/generated([^\s'"]*)/g, (_, suffix) => {
        let updatedPath = `${relativePath}${suffix}`;
        updatedPath = appendIndexIfDirectory(updatedPath, dirName);
        modified = true;
        return updatedPath;
      });
    }

    // Replace @/
    if (content.includes("@/")) {
      const relativePath = path.relative(dirName, distDir).replace(/\\/g, "/");

      content = content.replace(/@\/([^\s'"]*)/g, (_, suffix) => {
        let updatedPath = `${relativePath}/${suffix}`;
        updatedPath = appendIndexIfDirectory(updatedPath, dirName);
        modified = true;
        return updatedPath;
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(
      `Error processing ${filePath}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function processDirectory(dir: string): void {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith(".js")) {
        fixImportsInFile(filePath);
      }
    }
  } catch (error) {
    console.error(
      `Error processing directory ${dir}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

console.log("Fixing path aliases in compiled files...");
processDirectory(distDir);
console.log("Done fixing imports!");
