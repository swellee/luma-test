package services

import (
	"luma-ai-backend/models"
	"sync"
)

// 定义用户连接映射和锁
var (
	userConnections = make(map[int64][]chan models.SysMsgResponse)
	connectionsMu   sync.RWMutex
)

// AddUserConnection 添加用户SSE连接
func AddUserConnection(userID int64, ch chan models.SysMsgResponse) {
	connectionsMu.Lock()
	defer connectionsMu.Unlock()

	userConnections[userID] = append(userConnections[userID], ch)
}

// RemoveUserConnection 移除用户SSE连接
func RemoveUserConnection(userID int64, ch chan models.SysMsgResponse) {
	connectionsMu.Lock()
	defer connectionsMu.Unlock()

	if connections, exists := userConnections[userID]; exists {
		// 查找并移除指定的通道
		for i, conn := range connections {
			if conn == ch {
				// 关闭通道
				close(conn)

				// 从切片中移除
				userConnections[userID] = append(connections[:i], connections[i+1:]...)
				break
			}
		}

		// 如果该用户没有更多连接，清理映射
		if len(userConnections[userID]) == 0 {
			delete(userConnections, userID)
		}
	}
}

// pushMessageToUser 推送消息给用户
func pushMessageToUser(sysMsg *models.SysMsg) {
	// 获取用户的所有SSE连接并推送消息
	connectionsMu.RLock()
	defer connectionsMu.RUnlock()

	if connections, exists := userConnections[sysMsg.UserID]; exists {
		// 创建响应对象
		response := models.SysMsgResponse{
			ID:        sysMsg.ID,
			Title:     sysMsg.Title,
			Content:   sysMsg.Content,
			Status:    sysMsg.Status,
			CreatedAt: sysMsg.CreatedAt,
		}

		// 向所有连接推送消息
		for _, conn := range connections {
			select {
			case conn <- response:
			default:
				// 如果通道阻塞，忽略该消息
			}
		}
	}
}

// GetUserConnectionCount 获取用户连接数
func GetUserConnectionCount(userID int64) int {
	connectionsMu.RLock()
	defer connectionsMu.RUnlock()

	if connections, exists := userConnections[userID]; exists {
		return len(connections)
	}

	return 0
}
