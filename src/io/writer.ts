// src/io/writer.ts
import fs from "fs";
import path from "path";

const filePath = path.resolve(__dirname, "../../current.json");

export async function saveChampionState(
  myTeam: string[],
  theirTeam: string[],
  queueType: string = "RANKED_SOLO_5x5"
) {
  const data = {
    myTeam,
    theirTeam,
    queueType,
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("💾 current.json 저장됨!");
}
