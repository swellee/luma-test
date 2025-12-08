# 需求分析
参见[思维导图](https://pixso.cn/app/board/REiLXRTwcMGj_usSqbNPVg)

# 技术选型
## 前端
- React 19 基础框架
  - antd 6 UI库
  - react-router-dom 7 路由库
  - zustand 5 状态管理库
  - vite 7 构建工具
  - konva 10 图形绘制库
  - video.js 8 视频播放库
## 后端
- Gin v1.10.1 基础框架
  - XORM v1.3.2 ORM库
  - Redis v8.11.5 缓存库
  - JWT v4.5.0 认证库
  - MySQL v8 数据库
  - aliyun oss图床
## 架构设计
参加[架构图](https://pixso.cn/app/board/S8-SyQWCoKvlfBqql-YFMw)

## 结构目录
- frontend 前端代码
  - public 静态资源
  - src 源代码
    - assets 静态资源
    - components 组件
    - pages 页面
    - lib 工具库
     - api 接口
    - store 状态管理
    - routers 路由
    - theme 主题
  - deploy.h 部署脚本
- backend 后端代码
  - api 接口定义
  - services 服务层
  - config 配置
  - logs 日志
  - middleware jwt中间件
  - routes 路由
  - utils 工具库
  - deploy.h 部署脚本
## 开发文档
- [前端开发文档](frontend/README.md)
- [后端开发文档](backend/README.md)
# 操作文档
参考[操作文档](https://docs.google.com/document/d/12FhzYO4xPqx5OkNBj2-c3U69j3lvcysfd0-JObA_CL8/edit?usp=sharing)
