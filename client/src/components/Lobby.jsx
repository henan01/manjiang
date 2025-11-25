import { useState, useEffect } from 'react';
import socketService from '../services/socket';
import './Lobby.css';

function Lobby({ user, onEnterRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 监听错误
    socketService.on('error', (data) => {
      alert(data.message);
      setLoading(false);
    });

    // 获取房间列表
    socketService.getRooms();
    socketService.on('rooms_list', (data) => {
      setRooms(data.rooms);
    });

    return () => {
      socketService.off('error');
      socketService.off('rooms_list');
    };
  }, []);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const data = await socketService.createRoom();
      console.log('房间创建成功:', data);
      onEnterRoom(data.roomId);
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('创建房间失败，请重试');
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    socketService.joinRoom(roomId);
    onEnterRoom(roomId);
  };

  const handleRefresh = () => {
    socketService.getRooms();
  };

  return (
    <div className="lobby-page">
      <div className="lobby-container">
        <div className="lobby-header fade-in">
          <div>
            <h1>🀄 游戏大厅</h1>
            <p className="welcome-text">欢迎, <span className="user-name">{user.userName}</span></p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>创建中...</span>
              </>
            ) : (
              '➕ 创建房间'
            )}
          </button>
        </div>

        <div className="lobby-content">
          <div className="rooms-header">
            <h2>房间列表</h2>
            <button className="btn btn-secondary" onClick={handleRefresh}>
              🔄 刷新
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">🎴</div>
              <h3>暂无房间</h3>
              <p>点击"创建房间"开始游戏</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div key={room.id} className="room-card card slide-in">
                  <div className="room-header">
                    <h3>房间 #{room.id.slice(-6)}</h3>
                    <span className={`room-status status-${room.state}`}>
                      {room.state === 'waiting' ? '等待中' : 
                       room.state === 'playing' ? '游戏中' : '已结束'}
                    </span>
                  </div>
                  
                  <div className="room-info">
                    <div className="info-item">
                      <span className="label">玩家</span>
                      <span className="value">{room.players.length}/4</span>
                    </div>
                    <div className="info-item">
                      <span className="label">牌堆</span>
                      <span className="value">{room.deckCount || 136}</span>
                    </div>
                  </div>

                  <div className="room-players">
                    {room.players.map((player, idx) => (
                      <div key={player.id} className="player-tag">
                        👤 {player.name}
                      </div>
                    ))}
                  </div>

                  <button 
                    className="btn btn-primary btn-join"
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.players.length >= 4 || room.state !== 'waiting'}
                  >
                    {room.state === 'playing' ? '观战' : '加入房间'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
