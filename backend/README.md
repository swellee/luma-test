
这是基于 Go 和 Gin 框架的后端项目。
## 后端
- Gin v1.10.1 基础框架
  - XORM v1.3.2 ORM库
  - Redis v8.11.5 缓存库
  - JWT v4.5.0 认证库
  - MySQL v8 数据库
  - aliyun oss图床
  - brevo 邮件服务

## 环境要求

- Go 1.25
- MySQL 8.0+

## 目录结构

- backend 后端代码
  - api 接口定义
  - services 服务层
  - config 配置
  - logs 日志
  - middleware jwt中间件
  - routes 路由
  - utils 工具库
  - deploy.h 部署脚本

### 安装依赖

```bash
go mod tidy
```

### 启动服务器
- 环境变量：
    - ### 服务器配置
    - PORT=8080
    - GIN_MODE=debug

    - ### 数据库配置
    - DB_HOST=localhost
    - DB_PORT=3306
    - DB_USER=xxx
    - DB_PASSWORD=xxx
    - DB_NAME=luma

    - ### redis
    - REDIS_HOST=127.0.0.1
    - REDIS_PORT=6379

    - ### mail service
    - BREVO_API_KEY=xxxx-xxxxxxxx
    - BREVO_SENDER=sender@yourdomain.com
    - BREVO_SENDER_NAME=Sender

    - ### 阿里云配置
    - ALIYUN_ACCESS_ID=xxxxxxxx
    - ALIYUN_ACCESS_SECRET=xxxxxxxx
    - ALIYUN_BUCKET_NAME=xxxxxx
    - ALIYUN_ENDPOINT=oss-cn-shanghai.aliyuncs.com
    - ALIYUN_DOMAIN=https://xxxx.oss-cn-shanghai.aliyuncs.com

    - ```bash
        go run main.go
    ```

    - ### 部署
    - ```bash
        ./deploy.sh deploy
    ```