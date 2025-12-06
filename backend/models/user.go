package models

import (
	"time"
)

const (
	RoleAdmin     string = "admin"
	RoleAnnotator string = "annotator"
	RoleReviewer  string = "reviewer"
)

// User 用户模型
type User struct {
	ID        int64     `xorm:"pk autoincr 'id'" json:"id"`
	Username  string    `xorm:"varchar(50) unique not null 'username'" json:"username"`
	Email     string    `xorm:"varchar(100) unique not null 'email'" json:"email"`
	Password  string    `xorm:"varchar(255) not null 'password'" json:"-"`
	Avatar    string    `xorm:"varchar(255) 'avatar'" json:"avatar"`
	Role      string    `xorm:"varchar(50) 'role'" json:"role"`
	CreatedAt time.Time `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt time.Time `xorm:"updated 'updated_at'" json:"updated_at"`
}

type SendVerifyCodeRequest struct {
	Email       string `json:"email" binding:"required"`
	ForRegister bool   `json:"for_register"`
}
type CheckVerifyCodeRequest struct {
	Email string `json:"email" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

// UserRegisterRequest 用户注册请求
type UserRegisterRequest struct {
	Username string `json:"username" binding:"required,min=2,max=20"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=50"`
	Role     string `json:"role" binding:"required"`
}

// UserLoginRequest 用户登录请求
type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UserResponse 用户响应（不包含密码）
type UserResponse struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// UserResponse 用户响应（不包含密码）
type UserUpdateReq struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
}

// 重置密码请求结构体
type ResetPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// 验证码验证请求结构体
type VerifyResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Code        string `json:"code" binding:"required,len=6"`
	NewPassword string `json:"new_password" binding:"required"`
}

// UserListRequest 用户列表请求
type UserListRequest struct {
	Page     int `form:"page" binding:"required,min=1"`
	PageSize int `form:"page_size" binding:"required,min=1,max=100"`
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	List  []UserResponse `json:"list"`
	Total int64          `json:"total"`
}
