// src/ddragon/mapper.ts

let champIdToName: Record<number, string> = {};

/**
 * 챔피언 ID → 이름 변환
 */
export function getChampionName(id: number): string {
  return champIdToName[id] || `Unknown(${id})`;
}

/**
 * 챔피언 매핑 초기화 함수
 */
export function setChampionMapping(mapping: Record<number, string>) {
  champIdToName = mapping;
}
