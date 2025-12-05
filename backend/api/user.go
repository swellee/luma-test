package api

import (
	"net/http"

	"luma-ai-backend/middleware"
	"luma-ai-backend/models"
	"luma-ai-backend/services"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
)

// 声明全局服务常量
var userService = &services.UserService{}

func SendVerifyCode(c *gin.Context) {
	var req models.SendVerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}
	if req.ForRegister {
		if has, _ := userService.GetUserByIDByEmail(req.Email); has > 0 {
			utils.ResponseErr(c, "邮箱已存在", http.StatusBadRequest)
			return
		}
	}
	err := userService.SendVerificationCode(req.Email, "verify")
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}
	utils.ResponseSuccess(c)
}

func CheckVerifyCode(c *gin.Context) {
	var req models.CheckVerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, "参数错误", http.StatusBadRequest)
		return
	}
	err := userService.VerifyCode(req.Email, "verify", req.Code)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}
	utils.ResponseSuccess(c)
}

// Register 用户注册
func Register(c *gin.Context) {
	var req models.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := userService.RegisterUser(&req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	// 生成token
	token, err := middleware.GenerateToken(user)
	if err != nil {
		utils.ResponseErr(c, "生成token失败", http.StatusInternalServerError)
		return
	}

	// 返回用户信息和token
	userResp := &models.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}

	utils.ResponseOk(c, gin.H{
		"user":  userResp,
		"token": token,
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	var req models.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := userService.LoginUser(&req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusUnauthorized)
		return
	}

	// 生成token
	token, err := middleware.GenerateToken(user)
	if err != nil {
		utils.ResponseErr(c, "生成token失败", http.StatusInternalServerError)
		return
	}

	// 返回用户信息和token
	userResp := &models.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}

	utils.ResponseOk(c, gin.H{
		"user":  userResp,
		"token": token,
	})
}

// GetProfile 获取用户信息
func GetProfile(c *gin.Context) {
	// 从上下文获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "unauthorized", http.StatusUnauthorized)
		return
	}

	userResp, err := userService.GetUserByID(userID.(int64), true)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, userResp)
}

func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.UserUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}
	response, err := userService.UpdateProfile(userID.(int64), &req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}
	utils.ResponseOk(c, response)
}

// RequestPasswordReset 请求重置密码
func RequestPasswordReset(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	// 检查用户是否存在
	_, err := userService.GetUserByIDByEmail(req.Email)
	if err != nil {
		// 为了安全考虑，即使用户不存在也返回成功
		utils.ResponseSuccess(c)
		return
	}

	// 发送验证码到邮箱
	err = userService.SendVerificationCode(req.Email, "reset")
	if err != nil {
		utils.ResponseErr(c, "发送验证码失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseSuccess(c)
}

// VerifyCodeAndResetPassword 验证验证码并重置密码
func VerifyCodeAndResetPassword(c *gin.Context) {
	var req models.VerifyResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	// 验证验证码
	err := userService.VerifyCode(req.Email, "reset", req.Code)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	// 重置密码
	err = userService.ResetPassword(req.Email, req.NewPassword)
	if err != nil {
		utils.ResponseErr(c, "failed to reset password: "+err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseSuccess(c)
}

// GetUserList 获取用户列表
func GetUserList(c *gin.Context) {
	var req models.UserListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := userService.GetUserList(req.Page, req.PageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, response)
}
