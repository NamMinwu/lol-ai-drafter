// src/gemini/runner.ts
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const LOG_DIR = path.resolve(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "gemini.log");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(msg: string) {
  const t = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${t}] ${msg}\n`);
  console.log(msg);
}

export function runGeminiRecommendation(): Promise<string[]> {
  const geminiBin = "/opt/homebrew/bin/gemini";
  const inputPath = path.resolve(__dirname, "../../current.json");

  let stateJson: string;
  try {
    stateJson = fs.readFileSync(inputPath, "utf8");
    log(`Loaded current.json`);
  } catch (e: any) {
    log(`ERROR reading current.json: ${e.message}`);
    return Promise.reject(e);
  }

  const prompt = `
다음은 롤 솔로 랭크 픽 상황입니다. 밴 정보는 제외하고, "pick" 배열만 JSON 형태로 세 개의 챔피언을 추천해주세요.
${stateJson}
`.trim();

  log(`Constructed prompt`);

  return new Promise((resolve, reject) => {
    log(`Spawning Gemini CLI (YOLO mode)`);
    const cp = spawn(geminiBin, [
      "-y", // ← 자동 수락 플래그!
      "-p",
      prompt,
    ]);

    let out = "";
    cp.stdout.on("data", (d) => {
      out += d.toString();
      log(`stdout chunk ...`);
    });
    cp.stderr.on("data", (d) => log(`stderr: ${d.toString()}`));

    cp.on("close", (code) => {
      log(`Gemini exited with code=${code}`);
      log(`Full output:\n${out}`);

      if (code !== 0) {
        return reject(new Error(`Gemini exit code ${code}`));
      }
      const match = out.match(/\{[\s\S]*?\}/);
      if (!match) {
        log(`ERROR: No JSON block found`);
        return reject(new Error("JSON block not found"));
      }
      const jsonText = match[0];
      log(`Extracted JSON:\n${jsonText}`);

      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed.pick)) {
          throw new Error("parsed.pick is not an array");
        }
        log(`Parsed pick: ${parsed.pick.join(", ")}`);
        resolve(parsed.pick as string[]);
      } catch (e: any) {
        log(`ERROR parsing JSON: ${e.message}`);
        return reject(new Error("JSON parsing failed"));
      }
    });
  });
}
