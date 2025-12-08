import { http } from "../http"
import { 
  TaskListRequest, 
  TaskListResponse, 
  TaskDetail, 
  TaskClaimRequest, 
  TaskStatusUpdateRequest, 
  TaskAssignRequest,
  CommonRes,
  Task,
  TaskWipUpdateRequest,
  SavedAnnotation,
  ReviewAnnotationReq
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
   * 更新任务wip
   * @param data 任务状态更新请求
   */
  updateTaskWip(data: TaskWipUpdateRequest) {
    return http<Task>('/task/wip', {
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
  },

  saveAnnotation(data: SavedAnnotation){
    return http<SavedAnnotation>('/task/annotation', {
      method: 'POST',
      data
    })
  },
  getAnnotation(task_id: number, key: string){
    return http<SavedAnnotation>(`/task/annotation`, {
      method: 'GET',
      params: {
        task_id,
        key
      },
      showError: false
    })
  },
  saveReview(data: ReviewAnnotationReq){
    return http<SavedAnnotation>('/task/annotation/review', {
      method: 'PUT',
      data
    })
  }

}
