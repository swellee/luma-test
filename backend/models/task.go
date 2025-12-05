package models

import (
	"time"
)

// TaskStatus 任务状态枚举
type TaskStatus string

const (
	TaskStatusCreated    TaskStatus = "created"
	TaskStatusProcessing TaskStatus = "processing"
	TaskStatusApproved   TaskStatus = "approved"
	TaskStatusRejected   TaskStatus = "rejected"
)

// Task 任务模型
type Task struct {
	ID         int64      `xorm:"pk autoincr 'id'" json:"id"`
	Name       string     `xorm:"varchar(100) not null 'name'" json:"name"`
	PackageID  int64      `xorm:"'package_id' not null" json:"packageId"`
	AssignedTo int64      `xorm:"'assigned_to'" json:"assignedTo"` // 用户ID
	Status     TaskStatus `xorm:"varchar(20) 'status'" json:"status"`
	CreatedAt  time.Time  `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt  time.Time  `xorm:"updated 'updated_at'" json:"updated_at"`
}

// TaskResponse 任务响应
type TaskResponse struct {
	ID         int64      `json:"id"`
	Name       string     `json:"name"`
	PackageID  int64      `json:"packageId"`
	AssignedTo int64      `json:"assignedTo"`
	Status     TaskStatus `json:"status"`
	CreatedAt  time.Time  `json:"created_at"`
}

// TaskDetailResponse 任务详情响应（包含items）
type TaskDetailResponse struct {
	ID         int64      `json:"id"`
	Name       string     `json:"name"`
	PackageID  int64      `json:"packageId"`
	AssignedTo int64      `json:"assignedTo"`
	Status     TaskStatus `json:"status"`
	Items      []string   `json:"items"`
	CreatedAt  time.Time  `json:"created_at"`
}
