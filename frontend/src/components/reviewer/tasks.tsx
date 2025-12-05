import { api } from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";
import { useAntdTable } from "ahooks";
import { Button, Table, Tag, message, Space, Modal, Radio, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { useUserStore } from "@/store/user_store";

export default function ReviewerTasks() {
  const { user } = useUserStore();
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus | null>(null);

  // 获取可领取的任务列表（processed 状态且未分配）
  const {
    tableProps: availableTaskTableProps,
    refresh: refreshAvailableTasks,
  } = useAntdTable(async ({ pageSize, current }) => {
    const response = await api.task.getTaskList({
      page: current,
      page_size: pageSize,
      status: TaskStatus.processed,
      user_id: 0, // 获取未分配的任务
    });
    return {
      list: response.list.filter((task) => task.reviewer === 0),
      total: response.list.filter((task) => task.reviewer === 0).length,
    };
  });

  // 获取已分配给我的任务列表
  const { tableProps: myTaskTableProps, refresh: refreshMyTasks } =
    useAntdTable(async ({ pageSize, current }) => {
      const response = await api.task.getTaskList({
        page: current,
        page_size: pageSize,
        user_id: user?.id,
      });
      return {
        list: response.list,
        total: response.total,
      };
    });

  // 领取任务
  const handleClaimTask = async (task: Task) => {
    try {
      await api.task.claimTask({
        task_id: task.id,
      });
      message.success("Task claimed successfully");
      refreshAvailableTasks();
      refreshMyTasks();
    } catch (error) {
      message.error("Failed to claim task");
    }
  };

  // 打开更新状态模态框
  const openStatusModal = (task: Task) => {
    setSelectedTask(task);
    setNewStatus(null);
    setStatusModalVisible(true);
  };

  // 更新任务状态
  const handleUpdateStatus = async () => {
    if (!selectedTask || !newStatus) {
      message.error("Please select a status");
      return;
    }

    try {
      await api.task.updateTaskStatus({
        task_id: selectedTask.id,
        status: newStatus,
      });
      message.success("Task status updated successfully");
      setStatusModalVisible(false);
      refreshMyTasks();
    } catch (error) {
      message.error("Failed to update task status");
    }
  };

  // 任务状态标签颜色
  const getStatusTag = (status: TaskStatus) => {
    const statusConfig: Record<TaskStatus, { color: string; text: string }> = {
      [TaskStatus.created]: { color: "blue", text: "Created" },
      [TaskStatus.processing]: { color: "orange", text: "Processing" },
      [TaskStatus.processed]: { color: "purple", text: "Processed" },
      [TaskStatus.approved]: { color: "green", text: "Approved" },
      [TaskStatus.rejected]: { color: "red", text: "Rejected" },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 可领取任务的列
  const availableColumns: ColumnsType<Task> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Task Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Package ID",
      dataIndex: "packageId",
      key: "packageId",
      width: 100,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: TaskStatus) => getStatusTag(status),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record: Task) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => handleClaimTask(record)}
          >
            Claim
          </Button>
        </Space>
      ),
    },
  ];

  // 我的任务的列
  const myTaskColumns: ColumnsType<Task> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Task Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Package ID",
      dataIndex: "packageId",
      key: "packageId",
      width: 100,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: TaskStatus) => getStatusTag(status),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record: Task) => (
        <Space size="small">
          {record.status === TaskStatus.processed && (
            <Button
              type="primary"
              size="small"
              onClick={() => openStatusModal(record)}
            >
              Review
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl! text-green-900 font-bold mb-6">
        Task Management
      </h1>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            label: "My Tasks",
            key: "1",
            children: (
              <Table
                columns={myTaskColumns}
                {...myTaskTableProps}
                rowKey="packageId"
              />
            ),
          },
          {
            label: "Available Tasks",
            key: "2",
            children: (
              <Table
                columns={availableColumns}
                {...availableTaskTableProps}
                rowKey="packageId"
              />
            ),
          },
        ]}
      />

      {/* 更新状态模态框 */}
      <Modal
        title="Review Task"
        open={statusModalVisible}
        onOk={handleUpdateStatus}
        onCancel={() => setStatusModalVisible(false)}
        okText="Submit Review"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <div>
            <p>
              <strong>Task:</strong> {selectedTask?.name}
            </p>
            <p>
              <strong>Current Status:</strong>{" "}
              {selectedTask && getStatusTag(selectedTask.status)}
            </p>
          </div>
          <div>
            <label className="block mb-2">Set Status:</label>
            <Radio.Group
              onChange={(e) => setNewStatus(e.target.value)}
              value={newStatus}
            >
              <Radio value={TaskStatus.approved}>Approved</Radio>
              <Radio value={TaskStatus.rejected}>Rejected</Radio>
            </Radio.Group>
          </div>
        </div>
      </Modal>
    </div>
  );
}
