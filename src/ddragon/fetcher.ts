// src/ddragon/fetcher.ts
import axios from "axios";
import { setChampionMapping } from "./mapper";

type ChampData = {
  [champName: string]: {
    key: string;
    name: string;
  };
};

export async function loadChampionData(): Promise<void> {
  // 최신 버전 받아오기
  const versionRes = await axios.get(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );
  const latestVersion = versionRes.data[0];

  // 챔피언 데이터 가져오기 (영문 기준, 한글은 ko_KR 사용 가능)
  const champRes = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/ko_KR/champion.json`
  );
  const champData: ChampData = champRes.data.data;

  const mapping: Record<number, string> = {};
  for (const champName in champData) {
    const champ = champData[champName];
    const id = parseInt(champ.key, 10);
    mapping[id] = champ.name;
  }

  setChampionMapping(mapping);
  console.log("✅ 챔피언 ID 매핑 완료");
}
