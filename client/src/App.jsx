import { useState, useEffect } from 'react';
import Login from './components/Login';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);

  // 从 localStorage 恢复用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('mahjong_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        localStorage.removeItem('mahjong_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // 保存用户信息到 localStorage
    localStorage.setItem('mahjong_user', JSON.stringify(userData));
  };

  const handleEnterRoom = (roomId) => {
    setCurrentRoom(roomId);
    // 保存当前房间
    localStorage.setItem('mahjong_current_room', roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    localStorage.removeItem('mahjong_current_room');
  };

  // 登录页面
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 游戏桌面
  if (currentRoom) {
    return <GameTable roomId={currentRoom} user={user} onLeaveRoom={handleLeaveRoom} />;
  }

  // 大厅页面
  return <Lobby user={user} onEnterRoom={handleEnterRoom} />;
}

export default App;
