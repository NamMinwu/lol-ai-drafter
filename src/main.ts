// src/main.ts
import { authenticate } from "league-connect";
import https from "https";
import { loadChampionData } from "./ddragon/fetcher";
import { getChampionName } from "./ddragon/mapper";
import { saveChampionState } from "./io/writer";

async function main() {
  // 1) Data Dragon에서 챔피언 매핑 로드
  await loadChampionData();

  // 2) LCU 인증
  const creds = await authenticate({ awaitConnection: true });
  const auth = Buffer.from(`riot:${creds.password}`).toString("base64");

  // 3) 1초마다 챔피언 선택 상태 가져와서 이름으로 출력
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
            const myTeamIds = json.myTeam?.map((p: any) => p.championId) || [];
            const theirTeamIds =
              json.theirTeam?.map((p: any) => p.championId) || [];

            // 챔피언 이름으로 변환
            const myTeamNames = myTeamIds.map(getChampionName);
            const theirTeamNames = theirTeamIds.map(getChampionName);

            saveChampionState(myTeamNames, theirTeamNames);

            console.clear();
            console.log("✅ 내 팀 챔피언:", myTeamNames);
            console.log("❌ 상대 팀 챔피언:", theirTeamNames);
          } catch {
            /* pick/bann phase 가 아닐 때 무시 */
          }
        });
      }
    );

    req.on("error", () => {
      /* 연결 실패 시 무시 */
    });
    req.end();
  }, 1000);
}

main().catch(console.error);
