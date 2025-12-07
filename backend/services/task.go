package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

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

	task := &models.Task{
		Name:      taskName,
		PackageID: packageID,
		Annotator: 0, // 未分配
		Reviewer:  0, // 未分配
		Status:    models.TaskStatusCreated,
	}

	_, err = config.DB.Insert(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
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
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
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
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
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
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		WipIdx:    task.WipIdx,
		Items:     items,
		CreatedAt: task.CreatedAt,
	}, nil
}

// GetTaskList 获取任务列表（支持分页和过滤）
func (ts *TaskService) GetTaskList(userID int64, status models.TaskStatus, page, pageSize int) (*models.TaskListResponse, error) {
	var tasks []models.Task

	// 构建查询条件
	session := config.DB.NewSession()

	if userID > 0 {
		// 查询用户作为 annotator 或 reviewer 的任务
		session = session.Where("annotator = ? OR reviewer = ?", userID, userID)
	}

	if status != "" {
		session = session.Where("status = ?", status)
	}

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取任务列表
	err := session.Limit(pageSize, offset).Find(&tasks)
	if err != nil {
		return nil, err
	}

	// 获取总任务数
	total, err := session.Count(&models.Task{})
	if err != nil {
		return nil, err
	}

	// 转换为响应列表
	taskResponses := make([]models.TaskResponse, len(tasks))
	for i, task := range tasks {
		taskResponses[i] = models.TaskResponse{
			ID:        task.ID,
			Name:      task.Name,
			PackageID: task.PackageID,
			Annotator: task.Annotator,
			Reviewer:  task.Reviewer,
			Status:    task.Status,
			CreatedAt: task.CreatedAt,
		}
	}

	return &models.TaskListResponse{
		List:  taskResponses,
		Total: total,
	}, nil
}

// ClaimTask 用户领取任务
func (ts *TaskService) ClaimTask(taskID, userID int64, userRole string) (*models.TaskResponse, error) {
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

	// 根据任务状态和用户角色验证领取权限
	if task.Status == models.TaskStatusCreated {
		// created 状态的任务只能由 annotator 领取
		if userRole != models.RoleAnnotator {
			return nil, errors.New("只有标注员可以领取 created 状态的任务")
		}
		// 检查是否已经有标注员
		if task.Annotator > 0 {
			return nil, errors.New("任务已经被标注员领取")
		}
		task.Status = models.TaskStatusProcessing
		task.Annotator = userID
	} else if task.Status == models.TaskStatusProcessed {
		// processed 状态的任务只能由 reviewer 领取
		if userRole != models.RoleReviewer {
			return nil, errors.New("只有审核员可以领取 processed 状态的任务")
		}
		// 检查是否已经有审核员
		if task.Reviewer > 0 {
			return nil, errors.New("任务已经被审核员领取")
		}
		task.Status = models.TaskStatusReviewing
		task.Reviewer = userID
	} else {
		return nil, errors.New("该状态的任务不能被领取")
	}

	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
	}, nil
}

// UpdateTaskStatusWithValidation 更新任务状态（带权限验证和系统消息）
func (ts *TaskService) UpdateTaskStatusWithValidation(taskID, userID int64, userRole string, newStatus models.TaskStatus) (*models.TaskResponse, error) {
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 检查用户是否有权限更新任务状态
	if userRole != models.RoleAdmin {
		if userRole == models.RoleAnnotator && task.Annotator != userID {
			return nil, errors.New("只有任务分配的标注员可以更新任务状态")
		}
		if userRole == models.RoleReviewer && task.Reviewer != userID {
			return nil, errors.New("只有任务分配的审核员可以更新任务状态")
		}
	}

	// 验证状态转换的合法性
	switch userRole {
	case models.RoleAnnotator:
		// annotator 只能将任务状态从 created 变为 processed
		if task.Status != models.TaskStatusProcessing || newStatus != models.TaskStatusProcessed {
			return nil, errors.New("标注员只能将 processing 状态的任务变为 processed")
		}
	case models.RoleReviewer:
		// reviewer 只能将 processed 状态的任务变为 approved 或 rejected
		if task.Status != models.TaskStatusReviewing || (newStatus != models.TaskStatusApproved && newStatus != models.TaskStatusRejected) {
			return nil, errors.New("审核员只能将 processed 状态的任务变为 approved 或 rejected")
		}
	case models.RoleAdmin:
		// admin 可以任意更改状态
		// 不做限制
	default:
		return nil, errors.New("用户角色无效")
	}

	// 保存旧状态用于消息生成
	oldStatus := task.Status

	// 更新任务状态
	task.Status = newStatus
	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	// 生成系统消息
	err = ts.generateStatusChangeMessages(task, oldStatus, newStatus, userID)
	if err != nil {
		// 如果创建系统消息失败，记录错误但不影响任务状态更新
		// 在实际应用中可能需要记录日志
	}

	return &models.TaskResponse{
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
	}, nil
}

func (ts *TaskService) UpdateTaskWipIdx(taskID, userID int64, newWipIdx int) (*models.TaskResponse, error) {
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}
	if task.Status != models.TaskStatusProcessing && task.Status != models.TaskStatusReviewing {
		return nil, errors.New("只有 processing/reviewing 状态的任务才能更新 wipIdx")
	}
	task.WipIdx = newWipIdx
	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	return &models.TaskResponse{
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		WipIdx:    task.WipIdx,
		CreatedAt: task.CreatedAt,
	}, nil

}

// generateStatusChangeMessages 生成状态变更的系统消息
func (ts *TaskService) generateStatusChangeMessages(task *models.Task, oldStatus, newStatus models.TaskStatus, changedByUserID int64) error {
	sysMsgService := NewSysMsgService()

	// 获取用户信息用于消息内容
	changedByUser := &models.User{}
	_, err := config.DB.ID(changedByUserID).Get(changedByUser)
	if err != nil {
		return err
	}

	// 根据状态变更生成不同的消息
	if oldStatus == models.TaskStatusProcessing && newStatus == models.TaskStatusProcessed {
		// 标注完成：processing -> processed
		// 获取标注员信息
		annotatorUser := &models.User{}
		if task.Annotator > 0 {
			has, err := config.DB.ID(task.Annotator).Get(annotatorUser)
			if err == nil && has {
				message := &models.SysMsgCreateRequest{
					Title:   "任务标注完成",
					Content: fmt.Sprintf("%s 完成了任务 %s 的标注工作 [任务ID: %d]", annotatorUser.Username, task.Name, task.ID),
					UserID:  0, // 系统消息，发给所有人
				}
				_, err = sysMsgService.CreateSysMsg(message)
				if err != nil {
					return err
				}
			}
		}
	} else if oldStatus == models.TaskStatusProcessed && newStatus == models.TaskStatusApproved {
		// 审核通过：processed -> approved
		// 获取审核员信息
		reviewerUser := &models.User{}
		if task.Reviewer > 0 {
			has, err := config.DB.ID(task.Reviewer).Get(reviewerUser)
			if err == nil && has {
				message := &models.SysMsgCreateRequest{
					Title:   "任务审核通过",
					Content: fmt.Sprintf("%s 审核通过了任务 %s [任务ID: %d]", reviewerUser.Username, task.Name, task.ID),
					UserID:  0, // 系统消息，发给所有人
				}
				_, err = sysMsgService.CreateSysMsg(message)
				if err != nil {
					return err
				}
			}
		}
	} else if oldStatus == models.TaskStatusProcessed && newStatus == models.TaskStatusRejected {
		// 审核不通过：processed -> rejected
		// 获取审核员信息
		reviewerUser := &models.User{}
		if task.Reviewer > 0 {
			has, err := config.DB.ID(task.Reviewer).Get(reviewerUser)
			if err == nil && has {
				// 发送给标注员
				if task.Annotator > 0 {
					message := &models.SysMsgCreateRequest{
						Title:   "任务审核不通过",
						Content: fmt.Sprintf("任务 %s 审核不通过，请重新处理 [任务ID: %d]。审核员：%s", task.Name, task.ID, reviewerUser.Username),
						UserID:  task.Annotator,
					}
					_, err = sysMsgService.CreateSysMsg(message)
					if err != nil {
						return err
					}
				}
			}
		}
	}

	return nil
}

// AssignTaskWithNotification 分配任务给用户并生成系统消息
func (ts *TaskService) AssignTaskWithNotification(taskID, userID, adminID int64) (*models.TaskResponse, error) {
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

	// 检查管理员是否存在
	admin := &models.User{}
	has, err = config.DB.ID(adminID).Get(admin)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("管理员不存在")
	}

	// 只有管理员可以重新分配任务
	// 根据用户角色分配任务
	// 这里需要知道用户角色，但API没有传递，暂时根据任务状态判断
	// 在实际应用中，应该传递用户角色信息
	if user.Role == models.RoleAnnotator {
		// 分配给标注员
		task.Annotator = userID
		task.Status = models.TaskStatusProcessing
	} else if user.Role == models.RoleReviewer {
		// 分配给审核员
		task.Reviewer = userID
		task.Status = models.TaskStatusReviewing
	}

	_, err = config.DB.ID(taskID).Update(task)
	if err != nil {
		return nil, err
	}

	// 生成系统消息
	sysMsgService := NewSysMsgService()
	message := &models.SysMsgCreateRequest{
		Title:   "任务分配通知",
		Content: fmt.Sprintf("您已被分配了任务: %s [任务ID: %d]", task.Name, task.ID),
		UserID:  userID,
	}
	_, err = sysMsgService.CreateSysMsg(message)
	if err != nil {
		// 如果创建系统消息失败，记录错误但不影响任务分配
		// 在实际应用中可能需要记录日志
	}

	return &models.TaskResponse{
		ID:        task.ID,
		Name:      task.Name,
		PackageID: task.PackageID,
		Annotator: task.Annotator,
		Reviewer:  task.Reviewer,
		Status:    task.Status,
		CreatedAt: task.CreatedAt,
	}, nil
}

// SaveAnnotation 保存标注数据
func (ts *TaskService) SaveAnnotation(req models.SavedAnnotationRequest, userID int64) (*models.SavedAnnotation, error) {
	// 获取任务信息
	task := &models.Task{}
	has, err := config.DB.ID(req.TaskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 验证用户是否有权限保存该任务的标注
	// 只有任务的标注员可以保存标注
	if task.Annotator != userID {
		return nil, errors.New("只有任务的标注员可以保存标注")
	}

	// 检查任务状态是否允许保存标注
	if task.Status != models.TaskStatusProcessing {
		return nil, errors.New("只有 processing 状态的任务可以保存标注")
	}

	// 检查是否已存在相同 key 的标注
	existingAnnotation := &models.SavedAnnotation{}
	has, err = config.DB.Where("task_id = ? AND `key` = ?", req.TaskID, req.Key).Get(existingAnnotation)
	if err != nil {
		return nil, err
	}

	// 创建或更新标注数据
	annotation := &models.SavedAnnotation{
		TaskID: req.TaskID,
		Key:    req.Key,
		Meta:   req.Meta,
	}

	if has {
		// 更新现有标注
		annotation.ID = existingAnnotation.ID
		_, err = config.DB.ID(annotation.ID).Update(annotation)
		if err != nil {
			return nil, err
		}
	} else {
		// 创建新标注
		_, err = config.DB.Insert(annotation)
		if err != nil {
			return nil, err
		}
	}

	// 获取完整的标注数据（包含创建时间等）
	fullAnnotation := &models.SavedAnnotation{}
	has, err = config.DB.ID(annotation.ID).Get(fullAnnotation)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("保存标注后获取数据失败")
	}

	return fullAnnotation, nil
}

// ReviewAnnotation 审核标注数据
func (ts *TaskService) ReviewAnnotation(req models.ReviewAnnotationReq, userID int64) (*models.SavedAnnotation, error) {
	// 获取标注信息
	annotation := &models.SavedAnnotation{}
	has, err := config.DB.ID(req.AnnotationID).Get(annotation)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("标注不存在")
	}

	// 获取任务信息
	task := &models.Task{}
	has, err = config.DB.ID(annotation.TaskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 验证用户是否有权限审核该任务的标注
	// 只有任务的审核员可以审核标注
	if task.Reviewer != userID {
		return nil, errors.New("只有任务的审核员可以审核标注")
	}

	// 检查任务状态是否允许审核标注
	if task.Status != models.TaskStatusReviewing {
		return nil, errors.New("只有 reviewing 状态的任务可以审核标注")
	}

	// 创建审核信息
	reviewInfo := &models.ReviewInfo{
		Score:      req.Score,
		Comment:    req.Comment,
		ReviewerID: userID,
		ReviewedAt: time.Now().Format(time.RFC3339),
	}

	// 更新标注的审核信息
	annotation.Review = reviewInfo
	_, err = config.DB.ID(annotation.ID).Update(annotation)
	if err != nil {
		return nil, err
	}

	// 获取完整的标注数据（包含审核信息等）
	fullAnnotation := &models.SavedAnnotation{}
	has, err = config.DB.ID(annotation.ID).Get(fullAnnotation)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("审核标注后获取数据失败")
	}

	return fullAnnotation, nil
}

// GetAnnotationByTaskAndKey 根据任务ID和key获取标注数据
func (ts *TaskService) GetAnnotationByTaskAndKey(taskID int64, key string, userID int64, userRole string) (*models.SavedAnnotation, error) {
	// 获取任务信息
	task := &models.Task{}
	has, err := config.DB.ID(taskID).Get(task)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("任务不存在")
	}

	// 验证用户是否有权限查看该任务的标注
	// 管理员可以查看所有标注
	if userRole == models.RoleAdmin {
		// 管理员可以查看，继续执行
	} else if userRole == models.RoleAnnotator && task.Annotator == userID {
		// 标注员可以查看自己任务的标注
	} else if userRole == models.RoleReviewer && task.Reviewer == userID {
		// 审核员可以查看自己任务的标注
	} else {
		return nil, errors.New("没有权限查看该任务的标注")
	}

	// 获取标注信息
	annotation := &models.SavedAnnotation{}
	has, err = config.DB.Where("task_id = ? AND `key` = ?", taskID, key).Get(annotation)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("标注不存在")
	}

	return annotation, nil
}
