package api

import (
	"net/http"

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
