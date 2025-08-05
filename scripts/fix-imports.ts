import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "..", "dist", "src");

function fixImportsInFile(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // Replace @/generated with relative path
    if (content.includes("@/generated")) {
      const relativePath = path.relative(path.dirname(filePath), path.join(distDir, "generated")).replace(/\\/g, "/");
      content = content.replace(/@\/generated/g, relativePath);
      modified = true;
    }

    // Replace @/ with relative path
    if (content.includes("@/")) {
      const relativePath = path.relative(path.dirname(filePath), distDir).replace(/\\/g, "/");
      content = content.replace(/@\//g, `${relativePath}/`);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed imports in: ${filePath}`);
    }
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error instanceof Error ? error.message : String(error));
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
      }
      else if (file.endsWith(".js")) {
        fixImportsInFile(filePath);
      }
    }
  }
  catch (error) {
    console.error(`Error processing directory ${dir}:`, error instanceof Error ? error.message : String(error));
  }
}

console.log("Fixing path aliases in compiled files...");
processDirectory(distDir);
console.log("Done fixing imports!");
