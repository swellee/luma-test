package config

import (
	"context"
	"fmt"
	"log"
	"os"

	"luma-ai-backend/models"

	"github.com/go-redis/redis/v8"
	_ "github.com/go-sql-driver/mysql"
	"xorm.io/xorm"
)

var (
	DB    *xorm.Engine
	Redis *redis.Client
)

func InitDB() {
	var err error
	// 从环境变量获取数据库连接信息
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	// 构建数据库连接字符串
	dataSourceName := dbUser + ":" + dbPassword + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName + "?charset=utf8mb4&parseTime=True&loc=Local"

	DB, err = xorm.NewEngine("mysql", dataSourceName)
	if err != nil {
		log.Fatal("failed to connect database:", err)
	}

	// 测试数据库连接
	if err = DB.Ping(); err != nil {
		log.Fatal("failed to ping database:", err)
	}

	// 设置连接池
	DB.SetMaxIdleConns(10)
	DB.SetMaxOpenConns(100)

	log.Println("successfully connected to database")

	// 同步数据库表结构
	syncDatabase(DB)
}

// InitRedis 初始化Redis连接
func InitRedis() {
	// 从环境变量获取Redis连接信息
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")

	if redisHost != "" && redisPort != "" {
		redisAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)
		Redis = redis.NewClient(&redis.Options{
			Addr: redisAddr,
		})

		// 测试Redis连接
		ctx := context.Background()
		_, err := Redis.Ping(ctx).Result()
		if err != nil {
			log.Printf("Failed to connect to Redis at %s: %v", redisAddr, err)
			Redis = nil // 连接失败时设为nil
		} else {
			log.Printf("Successfully connected to Redis at %s", redisAddr)
		}
	} else {
		log.Println("Redis host or port not configured")
	}
}

// syncDatabase 同步数据库表结构
func syncDatabase(engine *xorm.Engine) {
	tables := []interface{}{
		new(models.User),
		new(models.SysMsg),  // 添加系统消息表
		new(models.Bucket),  // 添加存储桶表
		new(models.Package), // 添加包表
		new(models.Task),    // 添加任务表
	}

	tableNames := []string{
		"用户",
		"系统消息",
		"存储桶",
		"包",
		"任务",
	}

	for i, table := range tables {
		if err := engine.Sync(table); err != nil {
			log.Fatalf("同步%s表失败: %v", tableNames[i], err)
		}
		log.Printf("%s表同步完成", tableNames[i])
	}

	log.Println("数据库表结构同步完成")
}
