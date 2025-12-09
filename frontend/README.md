# React + TypeScript + Vite
- React 19 基础框架
  - antd 6 UI库
  - react-router-dom 7 路由库
  - zustand 5 状态管理库
  - vite 7 构建工具
  - konva 10 图形绘制库
  - video.js 8 视频播放库
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
## 开发
  - 配置环境变量
    - VITE_API_HOST=http://localhost:8080
    - VITE_ALLOW_ADMIN_REGISTER=true
    - VITE_REGISTER_SKIP_VERIFY=true
  - pnpm dev
### 部署
./deploy.sh deploy