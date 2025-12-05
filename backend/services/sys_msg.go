package services

import (
	"luma-ai-backend/config"
	"luma-ai-backend/models"
)

// SysMsgService 系统消息服务
type SysMsgService struct{}

// CreateSysMsg 创建系统消息并推送给用户
func (s *SysMsgService) CreateSysMsg(req *models.SysMsgCreateRequest) (*models.SysMsg, error) {
	sysMsg := &models.SysMsg{
		Title:   req.Title,
		Content: req.Content,
		Status:  "unread",
		UserID:  req.UserID,
	}

	// 插入数据库
	_, err := config.DB.Insert(sysMsg)
	if err != nil {
		return nil, err
	}

	// 推送消息给用户
	s.pushToUser(sysMsg)

	return sysMsg, nil
}

// GetSysMsgList 获取系统消息列表
func (s *SysMsgService) GetSysMsgList(userID int64, status string, page, pageSize int) ([]models.SysMsg, int64, error) {
	sysMsgs := make([]models.SysMsg, 0)
	session := config.DB.Where("user_id = ?", userID)

	// 如果指定了状态，则添加状态筛选
	if status != "" {
		session = session.Where("status = ?", status)
	}

	// 分页查询
	session = session.Limit(pageSize, (page-1)*pageSize).OrderBy("created_at DESC")
	total, err := session.FindAndCount(&sysMsgs)
	if err != nil {
		return nil, 0, err
	}

	return sysMsgs, total, nil
}

func (s *SysMsgService) GetSysMsgUnreadCount(userID int64) (int64, error) {
	var sysMsg models.SysMsg
	count, err := config.DB.Where("user_id = ? AND status = ?", userID, "unread").Count(&sysMsg)
	return count, err
}

// MarkAsRead 将消息标记为已读
func (s *SysMsgService) MarkAsRead(userID int64, ids []int64, all string) error {
	// 如果all参数为"all"，则将所有未读消息标记为已读
	if all == "all" {
		_, err := config.DB.Where("user_id = ? AND status = ?", userID, "unread").Update(&models.SysMsg{Status: "read"})
		return err
	}

	// 否则只更新指定ID的消息
	if len(ids) > 0 {
		_, err := config.DB.In("id", ids).And("user_id = ?", userID).Update(&models.SysMsg{Status: "read"})
		return err
	}

	return nil
}

// pushToUser 通过SSE推送消息给用户
func (s *SysMsgService) pushToUser(sysMsg *models.SysMsg) {
	// 这里将消息推送到用户的SSE连接
	// 实际实现在sse.go中
	pushMessageToUser(sysMsg)
}
