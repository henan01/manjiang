// 麻将牌定义
export const TILE_TYPES = {
  WAN: "wan", // 万
  TIAO: "tiao", // 条
  TONG: "tong", // 筒
  FENG: "feng", // 风 (东南西北)
  JIAN: "jian", // 箭 (中发白)
};

// 生成完整的麻将牌库 (136张)
export function createTileDeck() {
  const tiles = [];
  let id = 0;

  // 万、条、筒 各 1-9，每种4张
  [TILE_TYPES.WAN, TILE_TYPES.TIAO, TILE_TYPES.TONG].forEach((type) => {
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({ id: id++, type, value });
      }
    }
  });

  // 风牌：东(1)南(2)西(3)北(4)，各4张
  for (let value = 1; value <= 4; value++) {
    for (let i = 0; i < 4; i++) {
      tiles.push({ id: id++, type: TILE_TYPES.FENG, value });
    }
  }

  // 箭牌：中(1)发(2)白(3)，各4张
  for (let value = 1; value <= 3; value++) {
    for (let i = 0; i < 4; i++) {
      tiles.push({ id: id++, type: TILE_TYPES.JIAN, value });
    }
  }

  return tiles;
}

// 洗牌算法 (Fisher-Yates)
export function shuffleTiles(tiles) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 判断是否可以吃 (只能吃上家的牌)
export function canChi(handTiles, tile) {
  const sameSuit = handTiles.filter(
    (t) =>
      t.type === tile.type &&
      t.type !== TILE_TYPES.FENG &&
      t.type !== TILE_TYPES.JIAN
  );
  const values = sameSuit.map((t) => t.value).sort((a, b) => a - b);

  // 检查是否能组成顺子
  const v = tile.value;
  return (
    (values.includes(v - 2) && values.includes(v - 1)) ||
    (values.includes(v - 1) && values.includes(v + 1)) ||
    (values.includes(v + 1) && values.includes(v + 2))
  );
}

// 判断是否可以碰
export function canPeng(handTiles, tile) {
  const sameCount = handTiles.filter(
    (t) => t.type === tile.type && t.value === tile.value
  ).length;
  return sameCount >= 2;
}

// 判断是否可以杠
export function canGang(handTiles, tile) {
  const sameCount = handTiles.filter(
    (t) => t.type === tile.type && t.value === tile.value
  ).length;
  return sameCount >= 3;
}

// 简化的胡牌判断 (基础版本)
export function canHu(handTiles, newTile = null) {
  const tiles = newTile ? [...handTiles, newTile] : handTiles;

  // 必须是14张牌
  if (tiles.length !== 14) return false;

  // 简单判断：尝试所有可能的将牌
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (
        tiles[i].type === tiles[j].type &&
        tiles[i].value === tiles[j].value
      ) {
        // 找到一对将牌，检查剩余牌是否都能组成顺子或刻子
        const remaining = tiles.filter((_, idx) => idx !== i && idx !== j);
        if (canFormMelds(remaining)) {
          return true;
        }
      }
    }
  }

  return false;
}

// 检查是否能组成面子 (顺子或刻子)
function canFormMelds(tiles) {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;

  const sorted = [...tiles].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.value - b.value;
  });

  // 尝试刻子
  if (
    sorted[0].type === sorted[1]?.type &&
    sorted[0].value === sorted[1]?.value &&
    sorted[0].type === sorted[2]?.type &&
    sorted[0].value === sorted[2]?.value
  ) {
    return canFormMelds(sorted.slice(3));
  }

  // 尝试顺子 (只对数字牌)
  if (
    sorted[0].type !== TILE_TYPES.FENG &&
    sorted[0].type !== TILE_TYPES.JIAN
  ) {
    const v = sorted[0].value;
    const idx1 = sorted.findIndex(
      (t, i) => i > 0 && t.type === sorted[0].type && t.value === v + 1
    );
    const idx2 = sorted.findIndex(
      (t, i) => i > idx1 && t.type === sorted[0].type && t.value === v + 2
    );

    if (idx1 > 0 && idx2 > 0) {
      const remaining = sorted.filter(
        (_, i) => i !== 0 && i !== idx1 && i !== idx2
      );
      return canFormMelds(remaining);
    }
  }

  return false;
}

// 获取牌的显示名称
export function getTileName(tile) {
  const typeNames = {
    wan: "万",
    tiao: "条",
    tong: "筒",
    feng: ["", "东", "南", "西", "北"],
    jian: ["", "中", "发", "白"],
  };

  if (tile.type === TILE_TYPES.FENG) {
    return typeNames.feng[tile.value];
  } else if (tile.type === TILE_TYPES.JIAN) {
    return typeNames.jian[tile.value];
  } else {
    return `${tile.value}${typeNames[tile.type]}`;
  }
}
