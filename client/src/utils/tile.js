export function getTileDisplay(tile) {
  if (!tile) return '';
  
  const typeNames = {
    wan: '万',
    tiao: '条',
    tong: '筒',
    feng: ['', '东', '南', '西', '北'],
    jian: ['', '中', '发', '白']
  };
  
  if (tile.type === 'feng') {
    return typeNames.feng[tile.value];
  } else if (tile.type === 'jian') {
    return typeNames.jian[tile.value];
  } else {
    return `${tile.value}${typeNames[tile.type]}`;
  }
}

export function getTileClass(tile) {
  return `tile ${tile.type}`;
}

export function getTileEmoji(tile) {
  // 使用 Unicode 麻将牌符号
  const emojiMap = {
    wan: ['', '🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'],
    tiao: ['', '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'],
    tong: ['', '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'],
    feng: ['', '🀀', '🀁', '🀂', '🀃'],
    jian: ['', '🀄', '🀅', '🀆']
  };
  
  return emojiMap[tile.type]?.[tile.value] || getTileDisplay(tile);
}
