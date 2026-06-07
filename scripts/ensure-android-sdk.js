const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const androidDir = path.join(projectRoot, "android");
const localPropertiesPath = path.join(androidDir, "local.properties");

const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(os.homedir(), "AppData", "Local", "Android", "Sdk"),
  "C:\\Android\\Sdk",
].filter(Boolean);

const sdkDir = candidates.find((candidate) => fs.existsSync(candidate));

if (!sdkDir) {
  console.error(
    "Android SDK not found. Set ANDROID_HOME or install Android SDK at %LOCALAPPDATA%\\Android\\Sdk."
  );
  process.exit(1);
}

if (!fs.existsSync(androidDir)) {
  console.error("Android project not found. Run `npx expo prebuild` first.");
  process.exit(1);
}

const normalizedSdkDir = sdkDir.replace(/\\/g, "/");
fs.writeFileSync(localPropertiesPath, `sdk.dir=${normalizedSdkDir}\n`);
console.log(`Wrote android/local.properties -> ${normalizedSdkDir}`);
