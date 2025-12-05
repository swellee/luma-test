import { http } from "../http"
import { 
  TaskListRequest, 
  TaskListResponse, 
  TaskDetail, 
  TaskClaimRequest, 
  TaskStatusUpdateRequest, 
  TaskAssignRequest,
  CommonRes,
  Task
} from "../types"

export const task = {
  /**
   * 获取任务列表
   * @param params 查询参数：user_id, status, page, page_size
   */
  getTaskList(params: TaskListRequest) {
    return http<TaskListResponse>('/task/list', {
      method: 'GET',
      params
    })
  },

  /**
   * 获取任务详情
   * @param taskId 任务ID
   */
  getTaskDetail(taskId: number) {
    return http<TaskDetail>(`/task/${taskId}`, {
      method: 'GET'
    })
  },

  /**
   * 领取任务
   * @param data 任务领取请求
   */
  claimTask(data: TaskClaimRequest) {
    return http<Task>('/task/claim', {
      method: 'POST',
      data
    })
  },

  /**
   * 更新任务状态
   * @param data 任务状态更新请求
   */
  updateTaskStatus(data: TaskStatusUpdateRequest) {
    return http<Task>('/task/status', {
      method: 'PUT',
      data
    })
  },

  /**
   * 管理员分配任务
   * @param data 任务分配请求
   */
  assignTask(data: TaskAssignRequest) {
    return http<Task>('/task/assign', {
      method: 'POST',
      data
    })
  }
}
