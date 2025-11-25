import { useState } from 'react';
import socketService from '../services/socket';
import './Login.css';

function Login({ onLogin }) {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      alert('请输入用户名');
      return;
    }

    setLoading(true);
    
    try {
      socketService.connect();
      const data = await socketService.login(userName.trim());
      onLogin(data);
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container fade-in">
        <div className="login-header">
          <h1>🀄 麻将游戏</h1>
          <p className="subtitle">欢迎来到在线麻将世界</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userName">输入你的昵称</label>
            <input
              id="userName"
              type="text"
              className="input"
              placeholder="请输入昵称"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={20}
              autoFocus
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-large"
            disabled={loading || !userName.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>登录中...</span>
              </>
            ) : (
              '进入游戏'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>支持 2-4 人对局 · 吃碰杠胡 · 多种玩法</p>
        </div>
      </div>
      
      <div className="background-decoration">
        <div className="tile-bg">🀀</div>
        <div className="tile-bg">🀁</div>
        <div className="tile-bg">🀂</div>
        <div className="tile-bg">🀃</div>
        <div className="tile-bg">🀄</div>
      </div>
    </div>
  );
}

export default Login;
