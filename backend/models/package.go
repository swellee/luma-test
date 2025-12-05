package models

import (
	"time"
)

// PackageStatus 包状态枚举
type PackageStatus string

const (
	PackageStatusPending   PackageStatus = "pending"
	PackageStatusPublished PackageStatus = "published"
)

// Package 包模型
type Package struct {
	ID        int64         `xorm:"pk autoincr 'id'" json:"id"`
	BucketID  int64         `xorm:"'bucket_id' not null" json:"bucketId"`
	Name      string        `xorm:"varchar(100) not null 'name'" json:"name"`
	Items     string        `xorm:"text 'items'" json:"items"` // JSON 数组存储
	Status    PackageStatus `xorm:"varchar(20) 'status'" json:"status"`
	CreatedAt time.Time     `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt time.Time     `xorm:"updated 'updated_at'" json:"updated_at"`
}

// PackageReq 创建/更新包请求
type PackageReq struct {
	ID       *int64   `json:"id,omitempty"`
	BucketID int64    `json:"bucketId" binding:"required"`
	Name     string   `json:"name" binding:"required"`
	Items    []string `json:"items" binding:"required"`
}

// PackageResponse 包响应
type PackageResponse struct {
	ID        int64         `json:"id"`
	BucketID  int64         `json:"bucketId"`
	Name      string        `json:"name"`
	Items     []string      `json:"items"`
	Status    PackageStatus `json:"status"`
	CreatedAt time.Time     `json:"created_at"`
}

// PackageItem 包列表项（不包含 items）
type PackageItem struct {
	ID        int64         `json:"id"`
	BucketID  int64         `json:"bucketId"`
	Name      string        `json:"name"`
	Status    PackageStatus `json:"status"`
	CreatedAt time.Time     `json:"created_at"`
}

// PackageListRequest 包列表请求
type PackageListRequest struct {
	Page     int `form:"page" binding:"required,min=1"`
	PageSize int `form:"page_size" binding:"required,min=1,max=100"`
}

// PackageListResponse 包列表响应
type PackageListResponse struct {
	List  []PackageItem `json:"list"`
	Total int64         `json:"total"`
}
