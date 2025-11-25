import { createTileDeck, shuffleTiles, canChi, canPeng, canGang, canHu } from './mahjong.js';

// 游戏状态
const GAME_STATE = {
  WAITING: 'waiting',      // 等待玩家
  READY: 'ready',          // 准备开始
  PLAYING: 'playing',      // 游戏中
  FINISHED: 'finished'     // 已结束
};

// 房间类
export class Room {
  constructor(id, creatorId) {
    this.id = id;
    this.creatorId = creatorId;
    this.players = [];           // 最多4个玩家
    this.spectators = [];        // 观战者列表
    this.spectateRequests = [];  // 观战申请列表 [{spectatorId, spectatorName, targetPlayerId, status: 'pending'|'approved'|'rejected'}]
    this.playerSpectators = {};  // 玩家的观战者映射 {playerId: [spectatorId1, spectatorId2, ...]}
    this.state = GAME_STATE.WAITING;
    this.deck = [];              // 牌堆
    this.currentPlayerIndex = 0; // 当前出牌玩家索引
    this.lastDiscardedTile = null; // 最后打出的牌
    this.discardedTiles = [];    // 所有弃牌
  }

  // 添加玩家或观战者
  addPlayer(playerId, playerName) {
    // 检查是否已在房间中
    if (this.players.find(p => p.id === playerId)) {
      return { success: false, message: '已在房间中', role: 'player' };
    }
    if (this.spectators.find(s => s.id === playerId)) {
      return { success: false, message: '已在观战中', role: 'spectator' };
    }

    // 如果玩家位满，加入玩家列表
    if (this.players.length < 4) {
      this.players.push({
        id: playerId,
        name: playerName,
        handTiles: [],
        discardedTiles: [],
        melds: [],
        ready: false,
        online: true,
        seatIndex: this.players.length  // 座位索引
      });
      return { success: true, message: '加入成功', role: 'player' };
    }
    
    // 房间满员，加入观战者列表
    this.spectators.push({
      id: playerId,
      name: playerName,
      joinTime: Date.now()
    });
    return { success: true, message: '以观战者身份加入', role: 'spectator' };
  }

  // 添加观战者
  addSpectator(playerId, playerName) {
    if (this.spectators.find(s => s.id === playerId)) {
      return { success: false, message: '已在观战中' };
    }
    
    this.spectators.push({
      id: playerId,
      name: playerName,
      joinTime: Date.now()
    });
    
    return { success: true, message: '观战成功' };
  }

  // 标记玩家掉线
  markPlayerOffline(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.online = false;
      return true;
    }
    return false;
  }

  // 观战者上座 (接管掉线玩家)
  spectatorTakeSeat(spectatorId, seatIndex) {
    const spectator = this.spectators.find(s => s.id === spectatorId);
    if (!spectator) {
      return { success: false, message: '观战者不存在' };
    }

    const player = this.players[seatIndex];
    if (!player) {
      return { success: false, message: '座位不存在' };
    }

    if (player.online) {
      return { success: false, message: '该座位玩家在线' };
    }

    // 移除观战者
    this.spectators = this.spectators.filter(s => s.id !== spectatorId);

    // 接管玩家数据
    player.id = spectatorId;
    player.name = spectator.name;
    player.online = true;

    return { success: true, message: '上座成功', player };
  }

  // 移除玩家或观战者
  removePlayer(playerId) {
    // 尝试从玩家列表移除
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      // 如果游戏进行中，标记为掉线而不是移除
      if (this.state === GAME_STATE.PLAYING) {
        this.players[playerIndex].online = false;
        return { removed: false, offline: true };
      }
      // 游戏未开始，直接移除
      this.players.splice(playerIndex, 1);
      if (this.players.length === 0 && this.spectators.length === 0) {
        this.state = GAME_STATE.FINISHED;
      }
      return { removed: true, offline: false };
    }

    // 尝试从观战者列表移除
    const spectatorIndex = this.spectators.findIndex(s => s.id === playerId);
    if (spectatorIndex !== -1) {
      this.spectators.splice(spectatorIndex, 1);
      if (this.players.length === 0 && this.spectators.length === 0) {
        this.state = GAME_STATE.FINISHED;
      }
      return { removed: true, offline: false };
    }

    return { removed: false, offline: false };
  }

  // 观战者申请观看某个玩家
  requestSpectate(spectatorId, spectatorName, targetPlayerId) {
    // 检查观战者是否存在
    const spectator = this.spectators.find(s => s.id === spectatorId);
    if (!spectator) {
      return { success: false, message: '观战者不存在' };
    }

    // 检查目标玩家是否存在
    const targetPlayer = this.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) {
      return { success: false, message: '目标玩家不存在' };
    }

    // 检查是否已经有待处理的申请
    const existingRequest = this.spectateRequests.find(
      r => r.spectatorId === spectatorId && r.targetPlayerId === targetPlayerId && r.status === 'pending'
    );
    if (existingRequest) {
      return { success: false, message: '已有待处理的申请' };
    }

    // 检查是否已经被授权
    if (this.playerSpectators[targetPlayerId]?.includes(spectatorId)) {
      return { success: false, message: '已被授权观看' };
    }

    // 创建申请
    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spectatorId,
      spectatorName,
      targetPlayerId,
      targetPlayerName: targetPlayer.name,
      status: 'pending',
      createdAt: Date.now()
    };

    this.spectateRequests.push(request);
    return { success: true, message: '申请已发送', request };
  }

  // 玩家同意观战申请
  approveSpectateRequest(playerId, requestId) {
    const request = this.spectateRequests.find(r => r.id === requestId);
    if (!request) {
      return { success: false, message: '申请不存在' };
    }

    if (request.targetPlayerId !== playerId) {
      return { success: false, message: '无权处理此申请' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: '申请已处理' };
    }

    // 更新申请状态
    request.status = 'approved';

    // 添加到玩家的观战者列表
    if (!this.playerSpectators[playerId]) {
      this.playerSpectators[playerId] = [];
    }
    this.playerSpectators[playerId].push(request.spectatorId);

    return { success: true, message: '已同意申请', request };
  }

  // 玩家拒绝观战申请
  rejectSpectateRequest(playerId, requestId) {
    const request = this.spectateRequests.find(r => r.id === requestId);
    if (!request) {
      return { success: false, message: '申请不存在' };
    }

    if (request.targetPlayerId !== playerId) {
      return { success: false, message: '无权处理此申请' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: '申请已处理' };
    }

    // 更新申请状态
    request.status = 'rejected';

    return { success: true, message: '已拒绝申请', request };
  }

  // 获取玩家的待处理申请
  getPendingRequests(playerId) {
    return this.spectateRequests.filter(
      r => r.targetPlayerId === playerId && r.status === 'pending'
    );
  }

  // 获取玩家的观战者列表
  getPlayerSpectators(playerId) {
    const spectatorIds = this.playerSpectators[playerId] || [];
    return this.spectators.filter(s => spectatorIds.includes(s.id));
  }

  // 移除观战者的授权
  removeSpectatorAuth(playerId, spectatorId) {
    if (this.playerSpectators[playerId]) {
      this.playerSpectators[playerId] = this.playerSpectators[playerId].filter(
        id => id !== spectatorId
      );
    }
  }

  // 开始游戏
  startGame() {
    if (this.players.length < 1) {
      return { success: false, message: '至少需要1名玩家' };
    }

    // 创建并洗牌
    this.deck = shuffleTiles(createTileDeck());
    this.state = GAME_STATE.PLAYING;
    this.currentPlayerIndex = 0;
    this.discardedTiles = [];

    // 发牌：每人13张
    this.players.forEach(player => {
      player.handTiles = this.deck.splice(0, 13);
      player.discardedTiles = [];
      player.melds = [];
    });

    // 庄家多摸一张
    this.players[0].handTiles.push(this.deck.shift());

    return { success: true, message: '游戏开始' };
  }

  // 出牌
  discardTile(playerId, tileId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, message: '玩家不存在' };
    }

    if (playerIndex !== this.currentPlayerIndex) {
      return { success: false, message: '不是你的回合' };
    }

    const player = this.players[playerIndex];
    const tileIndex = player.handTiles.findIndex(t => t.id === tileId);
    
    if (tileIndex === -1) {
      return { success: false, message: '没有这张牌' };
    }

    const tile = player.handTiles.splice(tileIndex, 1)[0];
    player.discardedTiles.push(tile);
    this.discardedTiles.push(tile);
    this.lastDiscardedTile = tile;

    return { success: true, tile };
  }

  // 摸牌
  drawTile(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: '玩家不存在' };
    }

    if (this.deck.length === 0) {
      return { success: false, message: '牌堆已空' };
    }

    const tile = this.deck.shift();
    player.handTiles.push(tile);

    return { success: true, tile };
  }

  // 检查玩家可以执行的操作
  getAvailableActions(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !this.lastDiscardedTile) {
      return [];
    }

    const actions = [];
    const tile = this.lastDiscardedTile;

    // 检查是否可以胡
    if (canHu(player.handTiles, tile)) {
      actions.push('hu');
    }

    // 检查是否可以杠
    if (canGang(player.handTiles, tile)) {
      actions.push('gang');
    }

    // 检查是否可以碰
    if (canPeng(player.handTiles, tile)) {
      actions.push('peng');
    }

    // 检查是否可以吃 (只能吃上家)
    const currentPlayerIndex = this.players.findIndex(p => p.id === playerId);
    const lastPlayerIndex = (this.currentPlayerIndex - 1 + this.players.length) % this.players.length;
    
    if (currentPlayerIndex === (this.currentPlayerIndex + 1) % this.players.length && canChi(player.handTiles, tile)) {
      actions.push('chi');
    }

    return actions;
  }

  // 执行碰
  executePeng(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !this.lastDiscardedTile) {
      return { success: false, message: '无法碰牌' };
    }

    const tile = this.lastDiscardedTile;
    const sameTiles = player.handTiles.filter(t => t.type === tile.type && t.value === tile.value);
    
    if (sameTiles.length < 2) {
      return { success: false, message: '手牌不足' };
    }

    // 移除手牌中的两张
    sameTiles.slice(0, 2).forEach(t => {
      const idx = player.handTiles.findIndex(ht => ht.id === t.id);
      player.handTiles.splice(idx, 1);
    });

    // 添加到已碰牌组
    player.melds.push({
      type: 'peng',
      tiles: [...sameTiles.slice(0, 2), tile]
    });

    // 移除弃牌堆中的最后一张
    this.discardedTiles.pop();
    this.lastDiscardedTile = null;

    // 切换到该玩家出牌
    this.currentPlayerIndex = this.players.findIndex(p => p.id === playerId);

    return { success: true };
  }

  // 下一个玩家
  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  // 获取房间状态
  getRoomState() {
    return {
      id: this.id,
      state: this.state,
      players: this.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        handCount: p.handTiles.length,
        discardedTiles: p.discardedTiles,
        melds: p.melds,
        ready: p.ready,
        online: p.online !== undefined ? p.online : true,
        seatIndex: idx,
        spectatorCount: (this.playerSpectators[p.id] || []).length  // 观战者数量
      })),
      spectators: this.spectators.map(s => ({
        id: s.id,
        name: s.name,
        joinTime: s.joinTime
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      deckCount: this.deck.length,
      lastDiscardedTile: this.lastDiscardedTile
    };
  }

  // 获取玩家的手牌 (仅该玩家和授权观战者可见)
  getPlayerHand(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.handTiles : [];
  }

  // 检查用户是否有权查看某玩家的手牌
  canViewPlayerHand(viewerId, targetPlayerId) {
    // 玩家自己可以看
    if (viewerId === targetPlayerId) {
      return true;
    }
    // 授权的观战者可以看
    return this.playerSpectators[targetPlayerId]?.includes(viewerId) || false;
  }
}

// 房间管理器
export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(creatorId, creatorName) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = new Room(roomId, creatorId);
    room.addPlayer(creatorId, creatorName);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => room.getRoomState());
  }
}
