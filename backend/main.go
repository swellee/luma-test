package main

import (
	"log"
	"os"

	"luma-ai-backend/config"
	"luma-ai-backend/middleware"
	"luma-ai-backend/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("未找到.env文件")
	}

	// 设置日志输出到文件并启用轮转
	logFile := &lumberjack.Logger{
		Filename:   "./logs/server.log",
		MaxSize:    100, // 每个日志文件最大100MB
		MaxAge:     30,  // 保留30天的日志
		MaxBackups: 10,  // 最多保留10个备份文件
		LocalTime:  true,
		Compress:   true, // 压缩旧的日志文件
	}

	// 只输出到文件
	log.SetOutput(logFile)

	// 设置运行模式
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 初始化数据库
	config.InitDB()
	defer config.DB.Close()

	// 初始化Redis
	config.InitRedis()

	// 初始化阿里云
	config.InitAliyun()
	// 初始化邮件服务
	config.InitBrevo()

	// 创建Gin引擎
	r := gin.Default()

	// 设置可信代理，解决 "[WARNING] You trusted all proxies" 警告
	// 在生产环境中应该根据实际情况设置可信代理IP地址
	// 如果应用直接暴露在公网，可以设置为空切片 []string{}
	// 如果在代理后面，应该设置代理服务器的IP地址，例如 []string{"127.0.0.1", "10.0.0.0/8"}
	if os.Getenv("GIN_TRUSTED_PROXIES") != "" {
		r.SetTrustedProxies([]string{os.Getenv("GIN_TRUSTED_PROXIES")})
	} else {
		// 默认情况下不信任任何代理
		r.SetTrustedProxies([]string{})
	}

	// 配置日志中间件
	r.Use(middleware.LoggingMiddleware())

	// 配置CORS中间件
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://api.test.co", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 设置路由
	routes.SetupRoutes(r)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	log.Printf("服务器启动在端口 %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
