// src/main.ts
import { authenticate } from "league-connect";
import https from "https";
import readline from "readline";
import { loadChampionData } from "./ddragon/fetcher";
import { getChampionName } from "./ddragon/mapper";
import { saveChampionState } from "./io/writer";
import { runGeminiRecommendation } from "./gemini/runner";

async function main() {
  // 1) Data Dragon 매핑 로드
  await loadChampionData();

  // 2) LCU 인증
  const creds = await authenticate({ awaitConnection: true });
  const auth = Buffer.from(`riot:${creds.password}`).toString("base64");

  // 3) readline 세팅 (키 입력 감지)
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  let pickReady = false; // 내 픽 타이밍 여부
  let lastStateKey = ""; // 마지막으로 그린 상태 (myNames|theirNames)

  // 4) R 키 눌렀을 때 추천 실행
  process.stdin.on("keypress", (_str, key) => {
    if (key.name === "r" && pickReady) {
      runGeminiRecommendation()
        .then((picks) => {
          console.log("\n🎯 추천 픽:", picks.join(", "));
          console.log("-------------------------");
        })
        .catch((err) => {
          console.error("❌ Gemini 호출 실패:", err);
        });
    }
    if (key.ctrl && key.name === "c") {
      process.exit(); // Ctrl+C 로 종료
    }
  });

  // 5) 1초마다 LCU 세션 체크
  setInterval(() => {
    const req = https.request(
      {
        hostname: "127.0.0.1",
        port: creds.port,
        path: "/lol-champ-select/v1/session",
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const myIds = (json.myTeam || []).map((p: any) => p.championId);
            const theirIds = (json.theirTeam || []).map(
              (p: any) => p.championId
            );

            // 내가 픽 타이밍인지 체크
            pickReady = myIds.includes(0);
            if (!pickReady) return;

            // 확정된 픽만 뽑아 이름 매핑
            const myNames = myIds
              .filter((i: any) => i !== 0)
              .map(getChampionName);
            const theirNames = theirIds
              .filter((i: any) => i !== 0)
              .map(getChampionName);

            // 상태가 바뀌었을 때만 화면 갱신
            const stateKey =
              JSON.stringify(myNames) + "|" + JSON.stringify(theirNames);
            if (stateKey !== lastStateKey) {
              lastStateKey = stateKey;

              console.clear();
              console.log("🕹️ 당신의 픽 타이밍입니다!");
              console.log("✅ 내 팀 (확정된):", myNames.join(", "));
              console.log("❌ 상대 팀 (확정된):", theirNames.join(", "));
              saveChampionState(myNames, theirNames);

              console.log("\n👉 Press R to get recommendation");
            }
          } catch {
            // pick/bann phase가 아닐 때는 무시
          }
        });
      }
    );

    req.on("error", () => {
      // 네트워크 에러 등 무시
    });
    req.end();
  }, 1000);
}

main().catch(console.error);
