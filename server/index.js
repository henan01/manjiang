import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './room.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();
const userSockets = new Map(); // userId -> socketId

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 用户登录
  socket.on('login', (data) => {
    const { userId, userName } = data;
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.userName = userName;
    
    socket.emit('login_success', { userId, userName });
    console.log(`用户登录: ${userName} (${userId})`);
  });

  // 创建房间
  socket.on('create_room', () => {
    if (!socket.userId) {
      socket.emit('error', { message: '请先登录' });
      return;
    }

    const room = roomManager.createRoom(socket.userId, socket.userName);
    socket.join(room.id);
    
    socket.emit('room_created', { roomId: room.id });
    io.to(room.id).emit('room_update', room.getRoomState());
    
    console.log(`房间创建: ${room.id} by ${socket.userName}`);
  });

  // 加入房间
  socket.on('join_room', (data) => {
    const { roomId } = data;
    
    if (!socket.userId) {
      socket.emit('error', { message: '请先登录' });
      return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.addPlayer(socket.userId, socket.userName);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    socket.join(roomId);
    socket.currentRoom = roomId;
    socket.userRole = result.role;  // 'player' 或 'spectator'
    
    // 通知用户他的角色
    socket.emit('joined_room', { 
      roomId, 
      role: result.role,
      message: result.message 
    });
    
    io.to(roomId).emit('room_update', room.getRoomState());
    console.log(`${socket.userName} 以${result.role === 'player' ? '玩家' : '观战者'}身份加入房间 ${roomId}`);
  });

  // 离开房间
  socket.on('leave_room', () => {
    if (socket.currentRoom) {
      const room = roomManager.getRoom(socket.currentRoom);
      if (room) {
        room.removePlayer(socket.userId);
        socket.leave(socket.currentRoom);
        
        if (room.players.length === 0) {
          roomManager.deleteRoom(socket.currentRoom);
          console.log(`房间已删除: ${socket.currentRoom}`);
        } else {
          io.to(socket.currentRoom).emit('room_update', room.getRoomState());
        }
      }
      socket.currentRoom = null;
    }
  });

  // 开始游戏
  socket.on('start_game', () => {
    if (!socket.currentRoom) {
      socket.emit('error', { message: '不在房间中' });
      return;
    }

    const room = roomManager.getRoom(socket.currentRoom);
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (room.creatorId !== socket.userId) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    const result = room.startGame();
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 通知所有玩家游戏开始
    io.to(socket.currentRoom).emit('game_started', room.getRoomState());
    
    // 给每个玩家发送他们的手牌
    room.players.forEach(player => {
      const socketId = userSockets.get(player.id);
      if (socketId) {
        io.to(socketId).emit('hand_tiles', {
          tiles: player.handTiles
        });
      }
      
      // 给授权的观战者发送手牌
      const spectators = room.getPlayerSpectators(player.id);
      spectators.forEach(spectator => {
        const spectatorSocketId = userSockets.get(spectator.id);
        if (spectatorSocketId) {
          io.to(spectatorSocketId).emit('spectator_hand_tiles', {
            targetPlayerId: player.id,
            tiles: player.handTiles
          });
        }
      });
    });

    console.log(`游戏开始: ${socket.currentRoom}`);
  });

  // 出牌
  socket.on('discard_tile', (data) => {
    const { tileId } = data;
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.discardTile(socket.userId, tileId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 通知所有玩家
    io.to(socket.currentRoom).emit('tile_discarded', {
      playerId: socket.userId,
      tile: result.tile,
      roomState: room.getRoomState()
    });

    // 检查其他玩家是否可以吃碰杠胡
    room.players.forEach(player => {
      if (player.id !== socket.userId) {
        const actions = room.getAvailableActions(player.id);
        if (actions.length > 0) {
          const socketId = userSockets.get(player.id);
          if (socketId) {
            io.to(socketId).emit('available_actions', {
              actions,
              tile: result.tile
            });
          }
        }
      }
    });
  });

  // 摸牌
  socket.on('draw_tile', () => {
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.drawTile(socket.userId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    socket.emit('tile_drawn', { tile: result.tile });
    io.to(socket.currentRoom).emit('room_update', room.getRoomState());
  });

  // 碰牌
  socket.on('peng', () => {
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.executePeng(socket.userId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    io.to(socket.currentRoom).emit('player_peng', {
      playerId: socket.userId,
      roomState: room.getRoomState()
    });

    // 发送更新后的手牌
    const player = room.players.find(p => p.id === socket.userId);
    socket.emit('hand_tiles', { tiles: player.handTiles });
  });

  // 跳过操作
  socket.on('pass', () => {
    const room = roomManager.getRoom(socket.currentRoom);
    if (room) {
      room.nextPlayer();
      io.to(socket.currentRoom).emit('room_update', room.getRoomState());
      
      // 下一个玩家摸牌
      const nextPlayer = room.players[room.currentPlayerIndex];
      const drawResult = room.drawTile(nextPlayer.id);
      
      if (drawResult.success) {
        const socketId = userSockets.get(nextPlayer.id);
        if (socketId) {
          io.to(socketId).emit('tile_drawn', { tile: drawResult.tile });
        }
      }
    }
  });

  // 观战者申请上座
  socket.on('take_seat', (data) => {
    const { seatIndex } = data;
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (socket.userRole !== 'spectator') {
      socket.emit('error', { message: '只有观战者可以上座' });
      return;
    }

    const result = room.spectatorTakeSeat(socket.userId, seatIndex);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 更新角色
    socket.userRole = 'player';
    
    // 通知所有人
    io.to(socket.currentRoom).emit('player_took_seat', {
      playerId: socket.userId,
      playerName: socket.userName,
      seatIndex,
      roomState: room.getRoomState()
    });

    // 发送手牌给新玩家
    const player = room.players[seatIndex];
    socket.emit('hand_tiles', { tiles: player.handTiles });

    console.log(`${socket.userName} 上座到位置 ${seatIndex}`);
  });

  // 观战者申请观看某个玩家
  socket.on('request_spectate', (data) => {
    const { targetPlayerId } = data;
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (socket.userRole !== 'spectator') {
      socket.emit('error', { message: '只有观战者可以申请' });
      return;
    }

    const result = room.requestSpectate(socket.userId, socket.userName, targetPlayerId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 通知观战者申请已发送
    socket.emit('spectate_request_sent', {
      request: result.request
    });

    // 通知目标玩家收到申请
    const targetSocketId = userSockets.get(targetPlayerId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('spectate_request_received', {
        request: result.request
      });
    }

    console.log(`${socket.userName} 申请观看玩家 ${result.request.targetPlayerName}`);
  });

  // 玩家同意观战申请
  socket.on('approve_spectate', (data) => {
    const { requestId } = data;
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.approveSpectateRequest(socket.userId, requestId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 通知观战者申请通过
    const spectatorSocketId = userSockets.get(result.request.spectatorId);
    if (spectatorSocketId) {
      io.to(spectatorSocketId).emit('spectate_approved', {
        request: result.request
      });
      
      // 发送目标玩家的手牌给观战者
      const player = room.players.find(p => p.id === socket.userId);
      if (player) {
        io.to(spectatorSocketId).emit('spectator_hand_tiles', {
          targetPlayerId: socket.userId,
          tiles: player.handTiles
        });
      }
    }

    // 更新房间状态
    io.to(socket.currentRoom).emit('room_update', room.getRoomState());

    console.log(`${socket.userName} 同意 ${result.request.spectatorName} 观战`);
  });

  // 玩家拒绝观战申请
  socket.on('reject_spectate', (data) => {
    const { requestId } = data;
    const room = roomManager.getRoom(socket.currentRoom);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const result = room.rejectSpectateRequest(socket.userId, requestId);
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // 通知观战者申请被拒
    const spectatorSocketId = userSockets.get(result.request.spectatorId);
    if (spectatorSocketId) {
      io.to(spectatorSocketId).emit('spectate_rejected', {
        request: result.request
      });
    }

    console.log(`${socket.userName} 拒绝 ${result.request.spectatorName} 观战`);
  });

  // 获取待处理的观战申请
  socket.on('get_pending_requests', () => {
    const room = roomManager.getRoom(socket.currentRoom);
    if (room) {
      const requests = room.getPendingRequests(socket.userId);
      socket.emit('pending_requests', { requests });
    }
  });

  // 获取房间列表
  socket.on('get_rooms', () => {
    const rooms = roomManager.getAllRooms();
    socket.emit('rooms_list', { rooms });
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    
    if (socket.currentRoom) {
      const room = roomManager.getRoom(socket.currentRoom);
      if (room) {
        const result = room.removePlayer(socket.userId);
        
        // 如果是游戏中掉线，通知其他玩家
        if (result.offline) {
          io.to(socket.currentRoom).emit('player_offline', {
            playerId: socket.userId,
            playerName: socket.userName,
            roomState: room.getRoomState()
          });
          console.log(`${socket.userName} 掉线 (游戏中)`);
        } else if (result.removed) {
          // 检查是否需要删除房间
          if (room.players.length === 0 && room.spectators.length === 0) {
            roomManager.deleteRoom(socket.currentRoom);
            console.log(`房间已删除: ${socket.currentRoom}`);
          } else {
            io.to(socket.currentRoom).emit('room_update', room.getRoomState());
          }
        }
      }
    }

    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🀄 麻将服务器运行在端口 ${PORT}`);
});
