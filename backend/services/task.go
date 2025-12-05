package services

import (
	"encoding/json"
	"errors"

	"luma-ai-backend/config"
	"luma-ai-backend/models"
)

// TaskService 任务服务
type TaskService struct{}

// NewTaskService 创建任务服务实例
func NewTaskService() *TaskService {
	return &TaskService{}
}

// CreateTaskForPackage 为包创建任务
func (ts *TaskService) CreateTaskForPackage(packageID int64, packageName string) (*models.TaskResponse, error) {
	// 获取包信息
	pkg := &models.Package{}
	has, err := config.DB.ID(packageID).Get(pkg)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("包不存在")
	}

	// 检查是否已经存在该包的任务
	existingTask := &models.Task{}
	has, err = config.DB.Where("package_id = ?", packageID).Get(existingTask)
	if err != nil {
		return nil, err
	}
	if has {
		return nil, errors.New("该包已存在任务")
	}

	// 创建任务
	// 任务名称使用包名称 + "任务"
	taskName := packageName + "任务"

	//（这里需要根据业务逻辑确定如何分配）
	// 暂时先设置为0，表示未分配
	assignedTo := int64(0)

	task := &models.Task{
		Name:       taskName,
		PackageID:  packageID,
		AssignedTo: assignedTo,
		Status:     models.TaskStatusCreated,
	}

	_, err = config.DB.Insert(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:         task.ID,
		Name:       task.Name,
		PackageID:  task.PackageID,
		AssignedTo: task.AssignedTo,
		Status:     task.Status,
		CreatedAt:  task.CreatedAt,
	}, nil
}

// GetTaskByPackageID 根据包ID获取任务
func (ts *TaskService) GetTaskByPackageID(packageID int64) (*models.TaskResponse, error) {
	task := &models.Task{}
	has, err := config.DB.Where("package_id = ?", packageID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	return &models.TaskResponse{
		ID:         task.ID,
		Name:       task.Name,
		PackageID:  task.PackageID,
		AssignedTo: task.AssignedTo,
		Status:     task.Status,
		CreatedAt:  task.CreatedAt,
	}, nil
}

// UpdateTaskStatus 更新任务状态
func (ts *TaskService) UpdateTaskStatus(taskID int64, status models.TaskStatus) (*models.TaskResponse, error) {
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 更新任务状态
	task.Status = status
	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:         task.ID,
		Name:       task.Name,
		PackageID:  task.PackageID,
		AssignedTo: task.AssignedTo,
		Status:     task.Status,
		CreatedAt:  task.CreatedAt,
	}, nil
}

// GetTaskDetail 获取任务详情（包含items）
func (ts *TaskService) GetTaskDetail(taskID int64) (*models.TaskDetailResponse, error) {
	// 获取任务信息
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 获取关联的包信息
	pkg := &models.Package{}
	has, err = config.DB.ID(task.PackageID).Get(pkg)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("关联的包不存在")
	}

	// 解析包中的items
	var items []string
	if pkg.Items != "" {
		err = json.Unmarshal([]byte(pkg.Items), &items)
		if err != nil {
			return nil, err
		}
	}

	return &models.TaskDetailResponse{
		ID:         task.ID,
		Name:       task.Name,
		PackageID:  task.PackageID,
		AssignedTo: task.AssignedTo,
		Status:     task.Status,
		Items:      items,
		CreatedAt:  task.CreatedAt,
	}, nil
}

// AssignTask 分配任务给用户
func (ts *TaskService) AssignTask(taskID int64, userID int64) (*models.TaskResponse, error) {
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 检查用户是否存在
	user := &models.User{}
	has, err = config.DB.ID(userID).Get(user)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("用户不存在")
	}

	// 分配任务
	task.AssignedTo = userID
	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:         task.ID,
		Name:       task.Name,
		PackageID:  task.PackageID,
		AssignedTo: task.AssignedTo,
		Status:     task.Status,
		CreatedAt:  task.CreatedAt,
	}, nil
}
