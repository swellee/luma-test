package api

import (
	"net/http"

	"luma-ai-backend/models"
	"luma-ai-backend/services"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
)

// 声明全局服务常量
var taskService = services.NewTaskService()

// GetTaskDetail 获取任务详情
func GetTaskDetail(c *gin.Context) {
	taskID, err := utils.ParseInt64(c.Param("task_id"))
	if err != nil {
		utils.ResponseErr(c, "无效的任务ID", http.StatusBadRequest)
		return
	}

	response, err := taskService.GetTaskDetail(taskID)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusNotFound)
		return
	}

	utils.ResponseOk(c, response)
}

// GetTaskList 获取任务列表
func GetTaskList(c *gin.Context) {
	var req models.TaskListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ResponseErr(c, "参数错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	response, err := taskService.GetTaskList(req.UserID, req.Status, req.Page, req.PageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, response)
}

// ClaimTask 用户领取任务
func ClaimTask(c *gin.Context) {
	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未登录", http.StatusUnauthorized)
		return
	}

	userRole, exists := c.Get("user_role")
	if !exists {
		utils.ResponseErr(c, "用户角色未找到", http.StatusUnauthorized)
		return
	}

	var req models.TaskClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, "参数错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	response, err := taskService.ClaimTask(req.TaskID, userID.(int64), userRole.(string))
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// UpdateTaskStatus 更新任务状态
func UpdateTaskStatus(c *gin.Context) {
	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未登录", http.StatusUnauthorized)
		return
	}

	userRole, exists := c.Get("user_role")
	if !exists {
		utils.ResponseErr(c, "用户角色未找到", http.StatusUnauthorized)
		return
	}

	var req models.TaskStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, "参数错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	response, err := taskService.UpdateTaskStatusWithValidation(req.TaskID, userID.(int64), userRole.(string), req.Status)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}
func UpdateTaskWipIdx(c *gin.Context) {
	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未登录", http.StatusUnauthorized)
		return
	}

	var req models.TaskWipUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, "参数错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	response, err := taskService.UpdateTaskWipIdx(req.TaskID, userID.(int64), req.WipIdx)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// AssignTask 管理员分配任务
func AssignTask(c *gin.Context) {
	// 获取当前用户信息（管理员）
	adminID, exists := c.Get("user_id")
	if !exists {
		utils.ResponseErr(c, "用户未登录", http.StatusUnauthorized)
		return
	}

	userRole, exists := c.Get("user_role")
	if !exists {
		utils.ResponseErr(c, "用户角色未找到", http.StatusUnauthorized)
		return
	}

	// 检查用户角色是否为管理员
	if userRole != models.RoleAdmin {
		utils.ResponseErr(c, "只有管理员可以分配任务", http.StatusForbidden)
		return
	}

	var req models.TaskAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, "参数错误: "+err.Error(), http.StatusBadRequest)
		return
	}

	response, err := taskService.AssignTaskWithNotification(req.TaskID, req.UserID, adminID.(int64))
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}
