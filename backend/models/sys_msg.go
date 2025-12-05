package models

import (
	"time"
)

// SysMsg 系统消息模型
type SysMsg struct {
	ID        int64     `xorm:"pk autoincr 'id'" json:"id"`
	Title     string    `xorm:"varchar(100) not null 'title'" json:"title"`
	Content   string    `xorm:"text not null 'content'" json:"content"`
	Status    string    `xorm:"varchar(20) not null default 'unread' 'status'" json:"status"` // unread: 未读, read: 已读
	UserID    int64     `xorm:"index 'user_id'" json:"user_id"`                               // 接收消息的用户ID
	CreatedAt time.Time `xorm:"created 'created_at'" json:"created_at"`
}

// SysMsgCreateRequest 创建系统消息请求
type SysMsgCreateRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
	UserID  int64  `json:"user_id" binding:"required"`
}

// SysMsgResponse 系统消息响应
type SysMsgResponse struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// SysMsgListRequest 系统消息列表请求
type SysMsgListRequest struct {
	Status   string `json:"status" form:"status"`
	Page     int    `json:"page" form:"page"`
	PageSize int    `json:"page_size" form:"page_size"`
}

// SysMsgReadRequest 设置消息已读请求
type SysMsgReadRequest struct {
	IDs []int64 `json:"ids"` // 消息ID列表
	All string  `json:"all"` // 如果为"all"表示全部设为已读
}
