# 麻将游戏

一个功能完整的网页版麻将游戏，支持多人在线对局。

## 快速开始

### 启动后端

```bash
cd server
npm run dev
```

### 启动前端

```bash
nvm use 20
cd client
npm run dev
```

然后访问 http://localhost:5173

## 功能特性

- ✅ 用户登录与房间系统
- ✅ 2-4 人在线对局
- ✅ 完整的吃碰杠胡逻辑
- ✅ 现代化 UI 设计
- ✅ 响应式布局 (手机/电脑)
- ✅ 实时通信 (Socket.io)

## 技术栈

- **后端**: Node.js + Express + Socket.io
- **前端**: React + Vite + Socket.io-client
- **样式**: Vanilla CSS

## 项目结构

```
majiang/
├── server/     # 后端服务器
├── client/     # 前端应用
└── shared/     # 共享代码
```

详细文档请查看 [walkthrough.md](file:///Users/zhangpanfeng/.gemini/antigravity/brain/20ab8155-83c5-4ecf-9140-ed20a8f2dce4/walkthrough.md)
