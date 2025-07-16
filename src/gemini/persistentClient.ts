// src/gemini/persistentClient.ts
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs/promises";

export class GeminiClient {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = "";
  private isReady = false;

  constructor(private binPath: string) {
    this.proc = spawn(this.binPath, ["--prompt-interactive", ""]);

    this.proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      this.buffer += text;
      if (!this.isReady && text.includes(">")) {
        this.isReady = true; // CLI 프롬프트 준비됨
      }
    });

    this.proc.stderr.on("data", (chunk) => {
      console.error("[Gemini stderr]", chunk.toString());
    });
  }

  async waitUntilReady(timeout = 3000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        if (this.isReady || Date.now() - start > timeout) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  async recommendFromFile(jsonPath: string): Promise<string[]> {
    await this.waitUntilReady();

    const content = await fs.readFile(jsonPath, "utf-8");
    this.buffer = "";

    const prompt = `
다음은 롤 솔로랭크 픽 상황입니다. 밴은 제외하고 "pick" 배열만 JSON 형태로 세 개 추천해 주세요.
${content}

결과는 반드시 JSON 형식으로 다음처럼 출력하세요:
\`\`\`json
{
  "pick": ["챔피언1", "챔피언2", "챔피언3"]
}
\`\`\`
`;

    this.proc.stdin.write(prompt + "\n");

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("[Full Gemini Output]");
        console.log(this.buffer);

        const jsonMatch = this.buffer.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
          console.error("[GeminiClient] JSON 블록을 찾지 못했습니다.");
          return reject("JSON 블록 없음");
        }

        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return resolve(parsed.pick || []);
        } catch (err) {
          return reject("JSON 파싱 실패: " + err);
        }
      }, 2000);
    });
  }

  dispose() {
    this.proc.stdin.end();
    this.proc.kill();
  }
}
