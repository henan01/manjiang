import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.userName = null;
  }

  connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket 已连接');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket 已断开');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket 错误:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // 登录
  login(userName) {
    return new Promise((resolve) => {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.userId = userId;
      this.userName = userName;

      this.socket.emit('login', { userId, userName });
      
      this.socket.once('login_success', (data) => {
        resolve(data);
      });
    });
  }

  // 创建房间
  createRoom() {
    return new Promise((resolve) => {
      this.socket.emit('create_room');
      
      this.socket.once('room_created', (data) => {
        resolve(data);
      });
    });
  }

  // 加入房间
  joinRoom(roomId) {
    this.socket.emit('join_room', { roomId });
  }

  // 离开房间
  leaveRoom() {
    this.socket.emit('leave_room');
  }

  // 开始游戏
  startGame() {
    this.socket.emit('start_game');
  }

  // 出牌
  discardTile(tileId) {
    this.socket.emit('discard_tile', { tileId });
  }

  // 摸牌
  drawTile() {
    this.socket.emit('draw_tile');
  }

  // 碰牌
  peng() {
    this.socket.emit('peng');
  }

  // 杠牌
  gang() {
    this.socket.emit('gang');
  }

  // 吃牌
  chi() {
    this.socket.emit('chi');
  }

  // 跳过
  pass() {
    this.socket.emit('pass');
  }

  // 观战者上座
  takeSeat(seatIndex) {
    this.socket.emit('take_seat', { seatIndex });
  }

  // 观战者申请观看某个玩家
  requestSpectate(targetPlayerId) {
    this.socket.emit('request_spectate', { targetPlayerId });
  }

  // 玩家同意观战申请
  approveSpectate(requestId) {
    this.socket.emit('approve_spectate', { requestId });
  }

  // 玩家拒绝观战申请
  rejectSpectate(requestId) {
    this.socket.emit('reject_spectate', { requestId });
  }

  // 获取待处理的观战申请
  getPendingRequests() {
    this.socket.emit('get_pending_requests');
  }

  // 获取房间列表
  getRooms() {
    this.socket.emit('get_rooms');
  }

  // 监听事件
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 移除监听
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // 只监听一次
  once(event, callback) {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }
}

export default new SocketService();
