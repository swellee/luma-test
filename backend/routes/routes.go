package routes

import (
	"luma-ai-backend/api"
	"luma-ai-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// 不再创建单独的API实例，直接使用包级别的处理函数

	// health check
	r.GET("/hello", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello, World!",
		})
	})
	// 公开路由（无需认证）
	public := r.Group("/")
	{
		// 用户认证相关
		public.POST("/user/register", api.Register)
		public.POST("/user/login", api.Login)
		public.POST("/user/send-code", api.SendVerifyCode)
		public.POST("/user/verify-code", api.CheckVerifyCode)

		public.POST("/user/password/forget", api.RequestPasswordReset)
		public.POST("/user/password/reset", api.VerifyCodeAndResetPassword)

	}

	// 受保护的路由（需要认证）
	protected := r.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// 用户相关
		protected.GET("/user/profile", api.GetProfile)
		protected.PUT("/user/profile", api.UpdateProfile)
		protected.GET("/user/list", api.GetUserList)

		// 存储桶相关
		protected.GET("/bucket/list", api.ListBuckets)
		protected.POST("/bucket/add", api.AddBucket)
		protected.GET("/bucket/:id", api.GetBucket)
		protected.PUT("/bucket/:id", api.UpdateBucket)
		protected.DELETE("/bucket/:id", api.DeleteBucket)
		protected.GET("/bucket/objects", api.ListObjects)

		// 包相关
		protected.POST("/package", api.SavePackage)
		protected.POST("/package/publish/:package_id", api.PublishPackage)
		protected.GET("/package/list", api.GetPackageList)
		protected.GET("/package/:package_id", api.GetPackageDetail)
		protected.DELETE("/package/:package_id", api.DeletePackage)

		// 任务相关
		protected.GET("/task/:task_id", api.GetTaskDetail)
		protected.GET("/task/list", api.GetTaskList)
		protected.POST("/task/claim", api.ClaimTask)
		protected.PUT("/task/status", api.UpdateTaskStatus)
		protected.POST("/task/assign", api.AssignTask)

		// 系统消息相关
		protected.GET("/sysmsg/list", api.GetSysMsgList)
		protected.GET("/sysmsg/unread", api.GetSysMsgUnreadCount)
		protected.PUT("/sysmsg/read", api.MarkSysMsgAsRead)
		protected.GET("/sysmsg/stream", api.SysMsgStream)

		protected.POST("/file", api.UploadFile)
		protected.DELETE("/file", api.DeleteFile)
	}
}
