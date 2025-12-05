# Anime AI 后端

这是基于 Go 和 Gin 框架的后端项目。

## 功能特性

- 用户认证（JWT）
- 剧本管理
- 游戏会话管理
- AI服务集成

## 技术栈

- Go 1.21+
- Gin Web 框架
- XORM (数据库ORM)
- MySQL
- Gorilla WebSocket
- aliyun Go SDK
- brevo email sdk

## 目录结构

```
backend/
├── api/          # API接口层
├── config/       # 配置文件
├── middleware/   # 中间件
├── models/       # 数据模型
├── routes/       # 路由配置
├── services/     # 业务逻辑层
├── utils/        # 工具函数
├── main.go       # 程序入口
├── go.mod        # Go模块定义
└── .env          # 环境变量配置
```

## 环境要求

- Go 1.21+
- MySQL 5.7+

### 安装依赖

```bash
go mod tidy
```

### 启动服务器

```bash
go run main.go
```