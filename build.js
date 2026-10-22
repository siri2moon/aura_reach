/**
 * build.js — Obfuscate & đóng gói extension vào file aura-reach.zip
 * Chạy: node build.js
 *
 * Các file JS sẽ được obfuscate bằng javascript-obfuscator.
 * Các file khác (html, css, json, png, ...) được copy nguyên vẹn.
 * Kết quả xuất ra file: aura-reach.zip
 */

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const ZIP_OUTPUT_NAME = "aura-reach.zip";

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  reservedNames: ["^chrome$", "^caches$", "^crypto$"],
  rotateStringArray: true,
  selfDefending: false,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: "variable",
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
  numbersToExpressions: false,
  simplify: true,
  target: "browser-no-eval",
};

const SKIP = new Set([
  ".env",
  ".git",
  ".gitattributes",
  ".gitignore",
  ".DS_Store",
  "node_modules",
  "dist",
  "build.js",
  "package.json",
  "package-lock.json",
  "identity-export",
  "identity-timestamp-userid.zip",
  "aura-reach.zip",
  "README.md",
  "_metadata",
  "test",
]);

const JS_FILES = new Set([
  "background.js",
  "content.js",
  "popup.js",
  "sniff.js",
  "threads-content.js",
  "youtube-content.js",
  "instagram-content.js",
  "x-content.js",
]);

function copyTelegramEnv(srcDir, stagingDir) {
  const dest = path.join(stagingDir, "telegram.env");
  const fromEnv = path.join(srcDir, ".env");
  const fromTelegram = path.join(srcDir, "telegram.env");
  if (fs.existsSync(fromEnv)) {
    fs.copyFileSync(fromEnv, dest);
    console.log("  🔑 Copied .env -> telegram.env");
    return;
  }
  if (fs.existsSync(fromTelegram)) {
    fs.copyFileSync(fromTelegram, dest);
    console.log("  🔑 Copied telegram.env");
    return;
  }
  console.warn("  ⚠️  Không thấy .env / telegram.env — Telegram sẽ không gửi được sau khi đóng gói.");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function obfuscateFile(src, dest) {
  ensureDir(path.dirname(dest));
  const code = fs.readFileSync(src, "utf8");
  console.log("  ⚡ Obfuscating " + path.basename(src) + "... (" + (code.length / 1024).toFixed(1) + " KB)");
  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
  fs.writeFileSync(dest, result.getObfuscatedCode(), "utf8");
  const after = fs.statSync(dest).size;
  console.log("    -> " + path.basename(dest) + " (" + (after / 1024).toFixed(1) + " KB)");
}

function collectFilesRecursively(dir, base = "") {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(fullPath, relPath));
    } else if (entry.isFile()) {
      files.push({
        name: relPath,
        data: fs.readFileSync(fullPath),
      });
    }
  }
  return files;
}

function zipStore(files) {
  const parts = [];
  const centrals = [];
  let offset = 0;
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  for (const file of files) {
    const nameBytes = Buffer.from(file.name.replace(/\\/g, "/"), "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const crc = crc32(data);
    const flag = 0x0800; // UTF-8 filename flag
    const local = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, ...u16(flag), 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), 0x00, 0x00,
    ]);
    parts.push(local, nameBytes, data);
    const central = Buffer.from([
      0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, ...u16(flag), 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(offset),
    ]);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.from([
    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset),
    0x00, 0x00,
  ]);
  return Buffer.concat([...parts, ...centrals, eocd]);
}

function crc32(bytes) {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

function build(srcDir) {
  const stagingDir = path.join(srcDir, ".build-staging");
  const zipDestPath = path.join(srcDir, ZIP_OUTPUT_NAME);

  console.log("🚀 Bắt đầu quá trình build & obfuscate Aura Reach...");

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  ensureDir(stagingDir);

  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    if (SKIP.has(entry) || entry.startsWith(".")) continue;

    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(stagingDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      const subEntries = fs.readdirSync(srcPath);
      for (const sub of subEntries) {
        if (sub.startsWith(".")) continue;
        copyFile(path.join(srcPath, sub), path.join(destPath, sub));
      }
      console.log("  📁 Copied dir  " + entry + "/");
    } else if (JS_FILES.has(entry)) {
      obfuscateFile(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
      console.log("  📄 Copied file " + entry);
    }
  }

  copyTelegramEnv(srcDir, stagingDir);

  // Thu thập tất cả các file đã obfuscate để nén thành ZIP
  console.log("\n📦 Đang nén các tệp tin vào " + ZIP_OUTPUT_NAME + "...");
  const filesToZip = collectFilesRecursively(stagingDir);
  const zipBuffer = zipStore(filesToZip);
  fs.writeFileSync(zipDestPath, zipBuffer);

  // Xoá thư mục tạm staging
  fs.rmSync(stagingDir, { recursive: true, force: true });
  if (fs.existsSync(path.join(srcDir, "dist"))) {
    fs.rmSync(path.join(srcDir, "dist"), { recursive: true, force: true });
  }

  const zipSizeKb = (fs.statSync(zipDestPath).size / 1024).toFixed(1);
  console.log("\n✅ ĐÃ TẠO THÀNH CÔNG: " + ZIP_OUTPUT_NAME + " (" + zipSizeKb + " KB)");
  console.log("👉 Bạn có thể gửi trực tiếp file " + ZIP_OUTPUT_NAME + " cho người dùng!");
}

build(path.resolve(__dirname));
