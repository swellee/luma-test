package api

import (
	"io"
	"net/http"
	"strconv"
	"time"

	"luma-ai-backend/models"
	"luma-ai-backend/services"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
)

var (
	sysMsgService = &services.SysMsgService{}
)

// GetSysMsgList 获取系统消息列表
func GetSysMsgList(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未认证", http.StatusUnauthorized)
		return
	}

	// 获取查询参数
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	// 限制页面大小
	if pageSize > 50 {
		pageSize = 50
	}

	// 获取消息列表
	list, total, err := sysMsgService.GetSysMsgList(userID.(int64), status, page, pageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, gin.H{
		"list":  list,
		"total": total,
	})
}

func GetSysMsgUnreadCount(c *gin.Context) {
	userID := c.GetInt64("user_id")
	count, err := sysMsgService.GetSysMsgUnreadCount(userID)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}
	utils.ResponseOk(c, gin.H{
		"count": count,
	})
}

// MarkSysMsgAsRead 将系统消息标记为已读
func MarkSysMsgAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未认证", http.StatusUnauthorized)
		return
	}

	var req models.SysMsgReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	// 标记消息为已读
	err := sysMsgService.MarkAsRead(userID.(int64), req.IDs, req.All)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, gin.H{"message": "操作成功"})
}

// SysMsgStream SSE消息流
func SysMsgStream(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未认证", http.StatusUnauthorized)
		return
	}

	// 设置SSE响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// 创建消息通道
	messageChan := make(chan models.SysMsgResponse, 10)

	// 添加用户连接
	services.AddUserConnection(userID.(int64), messageChan)
	defer services.RemoveUserConnection(userID.(int64), messageChan)

	// 发送初始连接成功消息
	c.Stream(func(w io.Writer) bool {
		c.Render(-1, utils.SSE{Data: "connected"})
		return false
	})

	// 客户端心跳检测
	clientGone := c.Done()

	// 消息推送循环
	for {
		select {
		case <-clientGone:
			// 客户端断开连接
			return
		case msg := <-messageChan:
			// 推送消息给客户端
			c.Stream(func(w io.Writer) bool {
				c.Render(-1, utils.SSE{Data: msg})
				return false
			})

			// 刷新响应
			c.Writer.Flush()
		case <-time.After(30 * time.Second):
			// 发送心跳消息保持连接
			c.Stream(func(w io.Writer) bool {
				c.Render(-1, utils.SSE{Data: "heartbeat"})
				return false
			})

			// 刷新响应
			c.Writer.Flush()
		}
	}
}
