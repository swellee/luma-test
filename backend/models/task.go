package models

import (
	"time"
)

// TaskStatus 任务状态枚举
type TaskStatus string

const (
	TaskStatusCreated    TaskStatus = "created"
	TaskStatusProcessing TaskStatus = "processing"
	TaskStatusProcessed  TaskStatus = "processed"
	TaskStatusReviewing  TaskStatus = "reviewing"
	TaskStatusApproved   TaskStatus = "approved"
	TaskStatusRejected   TaskStatus = "rejected"
)

// Task 任务模型
type Task struct {
	ID        int64      `xorm:"pk autoincr 'id'" json:"id"`
	Name      string     `xorm:"varchar(100) not null 'name'" json:"name"`
	PackageID int64      `xorm:"'package_id' not null" json:"packageId"`
	Annotator int64      `xorm:"'annotator'" json:"annotator"` // 标注员用户ID
	Reviewer  int64      `xorm:"'reviewer'" json:"reviewer"`   // 审核员用户ID
	Status    TaskStatus `xorm:"varchar(20) 'status'" json:"status"`
	WipIdx    int        `xorm:"'wip_idx' default(0)" json:"wipIdx"`
	CreatedAt time.Time  `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt time.Time  `xorm:"updated 'updated_at'" json:"updated_at"`
}

// TaskResponse 任务响应
type TaskResponse struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	PackageID int64      `json:"packageId"`
	Annotator int64      `json:"annotator"`
	Reviewer  int64      `json:"reviewer"`
	Status    TaskStatus `json:"status"`
	WipIdx    int        `json:"wipIdx"`
	CreatedAt time.Time  `json:"created_at"`
}

// TaskDetailResponse 任务详情响应（包含items）
type TaskDetailResponse struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	PackageID int64      `json:"packageId"`
	Annotator int64      `json:"annotator"`
	Reviewer  int64      `json:"reviewer"`
	WipIdx    int        `json:"wipIdx"`
	Status    TaskStatus `json:"status"`
	Items     []string   `json:"items"`
	CreatedAt time.Time  `json:"created_at"`
}

// TaskListRequest 任务列表请求
type TaskListRequest struct {
	UserID   int64      `form:"user_id"`
	Status   TaskStatus `form:"status"`
	Page     int        `form:"page" binding:"required,min=1"`
	PageSize int        `form:"page_size" binding:"required,min=1,max=100"`
}

// TaskListResponse 任务列表响应
type TaskListResponse struct {
	List  []TaskResponse `json:"list"`
	Total int64          `json:"total"`
}

// TaskAssignRequest 任务分配请求
type TaskAssignRequest struct {
	TaskID int64 `json:"task_id" binding:"required"`
	UserID int64 `json:"user_id" binding:"required"`
}

// TaskStatusUpdateRequest 任务状态更新请求
type TaskStatusUpdateRequest struct {
	TaskID int64      `json:"task_id" binding:"required"`
	Status TaskStatus `json:"status" binding:"required"`
}
type TaskWipUpdateRequest struct {
	TaskID int64 `json:"task_id" binding:"required"`
	WipIdx int   `json:"wipIdx" binding:"required"`
}

// TaskClaimRequest 任务领取请求
type TaskClaimRequest struct {
	TaskID int64 `json:"task_id" binding:"required"`
}

// MarkData 标记数据
type MarkData struct {
	Type string `json:"type" binding:"required"` // "rect", "circle", "polygon"
	Data any    `json:"data" binding:"required"`
}

// ReviewInfo 审核信息
type ReviewInfo struct {
	Score      int    `json:"score"`      // 0-5
	Comment    string `json:"comment"`    // 审核意见
	ReviewerID int64  `json:"reviewerId"` // 审核员用户ID
	ReviewedAt string `json:"reviewedAt"` // 审核时间
}

// SavedAnnotation 保存的标注数据
type SavedAnnotation struct {
	ID     int64  `xorm:"pk autoincr 'id'" json:"id,omitempty"`
	TaskID int64  `xorm:"'task_id' not null" json:"taskId" binding:"required"`
	Key    string `xorm:"varchar(500) 'key' not null" json:"key" binding:"required"` // S3 object key
	Meta   struct {
		BucketID int64      `json:"bucketId" binding:"required"`
		Marks    []MarkData `json:"marks" binding:"required"`
	} `xorm:"json 'meta'" json:"meta" binding:"required"`
	Review    *ReviewInfo `xorm:"json 'review'" json:"review,omitempty"` // 审核信息，可选
	CreatedAt time.Time   `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt time.Time   `xorm:"updated 'updated_at'" json:"updated_at"`
}

// SavedAnnotationRequest 保存标注请求
type SavedAnnotationRequest struct {
	TaskID int64  `json:"taskId" binding:"required"`
	Key    string `json:"key" binding:"required"`
	Meta   struct {
		BucketID int64      `json:"bucketId" binding:"required"`
		Marks    []MarkData `json:"marks" binding:"required"`
	} `json:"meta" binding:"required"`
}

// ReviewAnnotationReq 审核标注请求
type ReviewAnnotationReq struct {
	AnnotationID int64  `json:"annotationId" binding:"required"`
	Score        int    `json:"score" binding:"required,min=0,max=5"`
	Comment      string `json:"comment"`
}
