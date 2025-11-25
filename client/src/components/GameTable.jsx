import { useState, useEffect } from 'react';
import socketService from '../services/socket';
import Tile from './Tile';
import './GameTable.css';

function GameTable({ roomId, user, onLeaveRoom }) {
  const [roomState, setRoomState] = useState(null);
  const [handTiles, setHandTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const [actionTile, setActionTile] = useState(null);
  const [userRole, setUserRole] = useState('player'); // 'player' 或 'spectator'
  const [spectatorHandTiles, setSpectatorHandTiles] = useState(null); // 观战者看到的手牌
  const [targetPlayerId, setTargetPlayerId] = useState(null); // 观战目标玩家
  const [pendingRequests, setPendingRequests] = useState([]); // 待处理的申请
  const [showPlayerSelect, setShowPlayerSelect] = useState(false); // 显示选择玩家界面

  useEffect(() => {
    // 监听加入房间结果
    socketService.on('joined_room', (data) => {
      setUserRole(data.role);
    });

    // 监听房间更新
    socketService.on('room_update', (state) => {
      setRoomState(state);
    });

    // 监听游戏开始
    socketService.on('game_started', (state) => {
      setRoomState(state);
    });

    // 监听手牌更新
    socketService.on('hand_tiles', (data) => {
      setHandTiles(data.tiles);
    });

    // 监听出牌
    socketService.on('tile_discarded', (data) => {
      setRoomState(data.roomState);
      setSelectedTile(null);
    });

    // 监听摸牌
    socketService.on('tile_drawn', (data) => {
      setHandTiles(prev => [...prev, data.tile]);
    });

    // 监听可用操作
    socketService.on('available_actions', (data) => {
      setAvailableActions(data.actions);
      setActionTile(data.tile);
    });

    // 监听碰牌
    socketService.on('player_peng', (data) => {
      setRoomState(data.roomState);
      setAvailableActions([]);
      setActionTile(null);
    });

    // 监听玩家掉线
    socketService.on('player_offline', (data) => {
      setRoomState(data.roomState);
      alert(`玩家 ${data.playerName} 已掉线`);
    });

    // 监听观战者上座
    socketService.on('player_took_seat', (data) => {
      setRoomState(data.roomState);
      if (data.playerId === user.userId) {
        setUserRole('player');
        alert('上座成功！');
      } else {
        alert(`${data.playerName} 已上座`);
      }
    });

    // 监听观战申请发送成功
    socketService.on('spectate_request_sent', (data) => {
      alert(`已向 ${data.request.targetPlayerName} 发送观战申请`);
    });

    // 监听收到观战申请
    socketService.on('spectate_request_received', (data) => {
      setPendingRequests(prev => [...prev, data.request]);
    });

    // 监听观战申请通过
    socketService.on('spectate_approved', (data) => {
      setTargetPlayerId(data.request.targetPlayerId);
      alert(`${data.request.targetPlayerName} 同意了你的观战申请！`);
    });

    // 监听观战申请被拒
    socketService.on('spectate_rejected', (data) => {
      alert(`${data.request.targetPlayerName} 拒绝了你的观战申请`);
    });

    // 监听观战者手牌
    socketService.on('spectator_hand_tiles', (data) => {
      if (data.targetPlayerId === targetPlayerId || !targetPlayerId) {
        setSpectatorHandTiles(data.tiles);
        setTargetPlayerId(data.targetPlayerId);
      }
    });

    // 监听待处理申请
    socketService.on('pending_requests', (data) => {
      setPendingRequests(data.requests);
    });

    socketService.on('error', (data) => {
      alert(data.message);
    });

    // 获取待处理的申请
    if (userRole === 'player') {
      socketService.getPendingRequests();
    }

    return () => {
      socketService.off('joined_room');
      socketService.off('room_update');
      socketService.off('game_started');
      socketService.off('hand_tiles');
      socketService.off('tile_discarded');
      socketService.off('tile_drawn');
      socketService.off('available_actions');
      socketService.off('player_peng');
      socketService.off('player_offline');
      socketService.off('player_took_seat');
      socketService.off('spectate_request_sent');
      socketService.off('spectate_request_received');
      socketService.off('spectate_approved');
      socketService.off('spectate_rejected');
      socketService.off('spectator_hand_tiles');
      socketService.off('pending_requests');
      socketService.off('error');
    };
  }, [user.userId, userRole, targetPlayerId]);

  const handleStartGame = () => {
    socketService.startGame();
  };

  const handleTileClick = (tile) => {
    if (selectedTile?.id === tile.id) {
      setSelectedTile(null);
    } else {
      setSelectedTile(tile);
    }
  };

  const handleDiscard = () => {
    if (selectedTile) {
      socketService.discardTile(selectedTile.id);
    }
  };

  const handleDraw = () => {
    socketService.drawTile();
  };

  const handleAction = (action) => {
    switch (action) {
      case 'peng':
        socketService.peng();
        break;
      case 'gang':
        socketService.gang();
        break;
      case 'chi':
        socketService.chi();
        break;
      case 'hu':
        alert('恭喜胡牌！');
        break;
      default:
        break;
    }
    setAvailableActions([]);
    setActionTile(null);
  };

  const handlePass = () => {
    socketService.pass();
    setAvailableActions([]);
    setActionTile(null);
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom();
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      window.location.reload();
    }
  };

  const handleTakeSeat = (seatIndex) => {
    if (confirm(`确定要上座到位置 ${seatIndex + 1} 吗？`)) {
      socketService.takeSeat(seatIndex);
    }
  };

  const handleRequestSpectate = (playerId) => {
    socketService.requestSpectate(playerId);
    setShowPlayerSelect(false);
  };

  const handleApproveRequest = (requestId) => {
    socketService.approveSpectate(requestId);
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleRejectRequest = (requestId) => {
    socketService.rejectSpectate(requestId);
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  if (!roomState) {
    return (
      <div className="game-loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const currentPlayer = roomState.players[roomState.currentPlayerIndex];
  const myPlayerIndex = roomState.players.findIndex(p => p.id === user.userId);
  const isPlayer = myPlayerIndex !== -1;
  const isMyTurn = isPlayer && currentPlayer?.id === user.userId;
  const isSpectator = userRole === 'spectator';

  return (
    <div className="game-page">
      <div className="game-container">
        {/* 顶部信息栏 */}
        <div className="game-header">
          <div className="room-info-header">
            <h2>🀄 房间 #{roomId.slice(-6)}</h2>
            <div className="game-status">
              {roomState.state === 'waiting' ? '等待开始' : 
               roomState.state === 'playing' ? '游戏中' : '已结束'}
            </div>
            {isSpectator && (
              <div className="spectator-badge">👁️ 观战模式</div>
            )}
          </div>
          <div className="header-actions">
            <div className="deck-count">牌堆: {roomState.deckCount}</div>
            <button className="btn btn-secondary" onClick={handleLeaveRoom}>
              离开房间
            </button>
          </div>
        </div>

        {/* 游戏桌面 */}
        <div className="game-table">
          {/* 其他玩家区域 */}
          <div className="other-players">
            {roomState.players.map((player, idx) => {
              if (isPlayer && idx === myPlayerIndex) return null;
              
              return (
                <div 
                  key={player.id} 
                  className={`player-area ${idx === roomState.currentPlayerIndex ? 'active' : ''} ${!player.online ? 'offline' : ''}`}
                >
                  <div className="player-info">
                    <span className="player-name">
                      {player.name}
                      {idx === roomState.currentPlayerIndex && ' 🎯'}
                      {!player.online && ' 💤'}
                    </span>
                    <span className="hand-count">手牌: {player.handCount}</span>
                  </div>
                  
                  {/* 掉线玩家上座按钮 */}
                  {!player.online && isSpectator && roomState.state === 'playing' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTakeSeat(idx)}
                    >
                      上座
                    </button>
                  )}
                  
                  {/* 已打出的牌 */}
                  {player.discardedTiles.length > 0 && (
                    <div className="discarded-tiles-small">
                      {player.discardedTiles.slice(-5).map((tile, i) => (
                        <Tile key={i} tile={tile} disabled />
                      ))}
                    </div>
                  )}

                  {/* 已碰/杠的牌 */}
                  {player.melds.length > 0 && (
                    <div className="melds">
                      {player.melds.map((meld, i) => (
                        <div key={i} className="meld-group">
                          {meld.tiles.map((tile, j) => (
                            <Tile key={j} tile={tile} disabled />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 中央弃牌区 */}
          <div className="center-area">
            <div className="table-surface">
              {roomState.lastDiscardedTile && (
                <div className="last-discarded">
                  <p>最后打出</p>
                  <Tile tile={roomState.lastDiscardedTile} disabled />
                </div>
              )}
            </div>
          </div>

          {/* 观战者列表 */}
          {roomState.spectators && roomState.spectators.length > 0 && (
            <div className="spectators-panel">
              <h3>👁️ 观战者 ({roomState.spectators.length})</h3>
              <div className="spectators-list">
                {roomState.spectators.map((spectator) => (
                  <div key={spectator.id} className="spectator-item">
                    {spectator.name}
                    {spectator.id === user.userId && ' (你)'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 我的手牌区域 (仅玩家) */}
          {isPlayer && (
            <div className="my-area">
              <div className="my-info">
                <span className="my-name">
                  {roomState.players[myPlayerIndex]?.name} (你)
                  {isMyTurn && ' 🎯'}
                </span>
              </div>

              {roomState.state === 'waiting' && (
                <div className="waiting-area">
                  <p>等待玩家加入... ({roomState.players.length}/4)</p>
                  {roomState.players[0].id === user.userId && (
                    <button 
                      className="btn btn-primary"
                      onClick={handleStartGame}
                      disabled={roomState.players.length < 1}
                    >
                      开始游戏
                    </button>
                  )}
                </div>
              )}

              {roomState.state === 'playing' && (
                <>
                  {/* 手牌 */}
                  <div className="hand-tiles">
                    {handTiles.map((tile) => (
                      <Tile
                        key={tile.id}
                        tile={tile}
                        selected={selectedTile?.id === tile.id}
                        onClick={handleTileClick}
                        disabled={!isMyTurn}
                      />
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <div className="action-buttons">
                    {isMyTurn && (
                      <>
                        <button 
                          className="btn btn-primary"
                          onClick={handleDiscard}
                          disabled={!selectedTile}
                        >
                          出牌
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={handleDraw}
                          disabled={handTiles.length >= 14}
                        >
                          摸牌
                        </button>
                      </>
                    )}

                    {availableActions.length > 0 && (
                      <div className="special-actions">
                        <p>可以执行的操作:</p>
                        <div className="action-btns">
                          {availableActions.includes('hu') && (
                            <button className="btn btn-success" onClick={() => handleAction('hu')}>
                              胡 🎉
                            </button>
                          )}
                          {availableActions.includes('gang') && (
                            <button className="btn btn-primary" onClick={() => handleAction('gang')}>
                              杠
                            </button>
                          )}
                          {availableActions.includes('peng') && (
                            <button className="btn btn-primary" onClick={() => handleAction('peng')}>
                              碰
                            </button>
                          )}
                          {availableActions.includes('chi') && (
                            <button className="btn btn-primary" onClick={() => handleAction('chi')}>
                              吃
                            </button>
                          )}
                          <button className="btn btn-secondary" onClick={handlePass}>
                            过
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 观战者视图 */}
          {isSpectator && (
            <div className="spectator-view">
              {!targetPlayerId ? (
                <>
                  <div className="spectator-info">
                    <h3>👁️ 观战模式</h3>
                    <p>请选择一个玩家申请观战</p>
                  </div>
                  
                  <div className="player-select-grid">
                    {roomState.players.map((player) => (
                      <div key={player.id} className="player-select-card">
                        <div className="player-select-info">
                          <h4>{player.name}</h4>
                          <p>手牌: {player.handCount} 张</p>
                          {player.spectatorCount > 0 && (
                            <p className="spectator-count">👁️ {player.spectatorCount} 人观战</p>
                          )}
                        </div>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRequestSpectate(player.id)}
                        >
                          申请观战
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="spectator-info">
                    <h3>👁️ 观战中</h3>
                    <p>正在观看: {roomState.players.find(p => p.id === targetPlayerId)?.name}</p>
                  </div>

                  {/* 显示观战的手牌 */}
                  {spectatorHandTiles && spectatorHandTiles.length > 0 && (
                    <div className="spectator-hand-tiles">
                      <h4>玩家手牌</h4>
                      <div className="hand-tiles">
                        {spectatorHandTiles.map((tile, idx) => (
                          <Tile key={idx} tile={tile} disabled />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 玩家的观战申请通知 */}
          {isPlayer && pendingRequests.length > 0 && (
            <div className="spectate-requests-panel">
              <h3>📩 观战申请 ({pendingRequests.length})</h3>
              <div className="requests-list">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-info">
                      <span className="requester-name">{request.spectatorName}</span>
                      <span className="request-text">申请观战你的手牌</span>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        同意
                      </button>
                      <button 
                        className="btn btn-error btn-sm"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameTable;
