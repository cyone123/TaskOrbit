import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "public/fonts");
const revision = "737e3324305806514d7909874fa1818ae1808232";
const upstream = `https://raw.githubusercontent.com/google/material-design-icons/${revision}`;
const fontName = "material-symbols-rounded.woff2";
const manifestName = "material-symbols-rounded.json";

// Inspect icon props, conditional branches, configuration objects and UI defaults.
// Icons computed outside these patterns must be added here explicitly.
const extraIcons = [];
const icons = new Set(extraIcons);
function collect(expression) {
  if (!expression) return;
  if (ts.isStringLiteral(expression)) icons.add(expression.text);
  else if (ts.isConditionalExpression(expression)) {
    collect(expression.whenTrue);
    collect(expression.whenFalse);
  } else if (ts.isParenthesizedExpression(expression)) collect(expression.expression);
  else if (ts.isBinaryExpression(expression)) {
    collect(expression.left);
    collect(expression.right);
  }
}

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      const source = ts.createSourceFile(filename, await readFile(filename, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isJsxAttribute(node)) {
          const prop = node.name.getText(source);
          const tag = node.parent.parent.tagName.getText(source);
          if (node.initializer && (prop === "icon" || prop === "leadingIcon" || (tag === "Icon" && prop === "name"))) {
            collect(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer);
          }
        } else if (ts.isPropertyAssignment(node) && node.name.getText(source) === "icon") {
          collect(node.initializer);
        } else if (ts.isBindingElement(node) && node.name.getText(source) === "leadingIcon") {
          collect(node.initializer);
        } else if (ts.isVariableDeclaration(node) && node.name.getText(source) === "defaultIcon") {
          function returns(child) {
            if (ts.isReturnStatement(child)) collect(child.expression);
            ts.forEachChild(child, returns);
          }
          returns(node);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}

await scan(path.join(root, "src"));
const names = [...icons].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (process.argv.includes("--check")) {
  const manifest = JSON.parse(await readFile(path.join(output, manifestName), "utf8"));
  const font = await readFile(path.join(output, fontName));
  if (JSON.stringify(names) !== JSON.stringify(manifest.icons)) {
    throw new Error("图标引用已变更，请运行 pnpm generate:icons 后提交字体与清单。");
  }
  if (font.subarray(0, 4).toString() !== "wOF2" || digest(font) !== manifest.sha256) {
    throw new Error("图标字体缺失或损坏，请运行 pnpm generate:icons。");
  }
  console.log(`本地图标字体校验通过：${names.length} 个图标，${font.length} 字节。`);
} else {
  const temporary = await mkdtemp(path.join(tmpdir(), "task-orbit-icons-"));
  try {
    async function download(relative, destination) {
      const response = await fetch(`${upstream}/${relative}`, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`下载 ${relative} 失败：HTTP ${response.status}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    }
    await download("variablefont/MaterialSymbolsRounded%5BFILL,GRAD,opsz,wght%5D.ttf", path.join(temporary, "source.ttf"));
    await download("variablefont/MaterialSymbolsRounded%5BFILL,GRAD,opsz,wght%5D.codepoints", path.join(temporary, "codepoints"));
    await download("LICENSE", path.join(temporary, "LICENSE"));
    await writeFile(path.join(temporary, "icons.json"), JSON.stringify(names));
    const result = spawnSync(process.env.PYTHON || "python", [
      path.join(root, "scripts/subset-icon-font.py"), temporary,
    ], { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("字体生成或校验失败，请检查上方 Python 诊断；依赖安装说明见 public/fonts/README.md。");
    const font = await readFile(path.join(temporary, fontName));
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, fontName), font);
    await writeFile(path.join(output, "LICENSE"), await readFile(path.join(temporary, "LICENSE")));
    await writeFile(path.join(output, manifestName), JSON.stringify({
      source: `${upstream}/variablefont/MaterialSymbolsRounded%5BFILL,GRAD,opsz,wght%5D.ttf`,
      axes: { FILL: [0, 1], opsz: [20, 48], wght: 500, GRAD: 0 },
      icons: names,
      bytes: font.length,
      sha256: digest(font),
    }, null, 2) + "\n");
    console.log(`已生成 ${names.length} 个图标的 WOFF2 子集：${font.length} 字节。`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
