import { api } from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";
import { useAntdTable } from "ahooks";
import { Button, Table, message, Space, Modal, Select } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { getStatusTag } from "@/lib/util";
import { useUserStore } from "@/store/user_store";

export default function AdminTasks() {
  const self = useUserStore(state => state.user);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignUserId, setAssignUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 获取任务列表
  const { tableProps: taskTableProps, refresh: refreshTaskTable } = useAntdTable(
    async ({ pageSize, current }) => {
      const response = await api.task.getTaskList({
        page: current,
        page_size: pageSize,
      });
      return {
        list: response.list,
        total: response.total,
      };
    }
  );

  // 获取用户列表（用于分配任务）
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.user.getUserList(1, 100);
      setUsers(response.list.filter((user: any) => user.id !== self!.id));
    } catch (error) {
      message.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // 打开分配任务模态框
  const openAssignModal = (task: Task) => {
    setSelectedTask(task);
    setAssignUserId(null);
    loadUsers();
    setAssignModalVisible(true);
  };

  // 分配任务
  const handleAssignTask = async () => {
    if (!selectedTask || !assignUserId) {
      message.error("Please select a user");
      return;
    }

    try {
      await api.task.assignTask({
        task_id: selectedTask.id,
        user_id: assignUserId,
      });
      message.success("Task assigned successfully");
      setAssignModalVisible(false);
      refreshTaskTable();
    } catch (error) {
      message.error("Failed to assign task");
    }
  };

  const columns: ColumnsType<Task> = [
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
      title: "Annotator",
      dataIndex: "annotator",
      key: "annotator",
      width: 100,
      render: (annotator: number) => annotator || "Unassigned",
    },
    {
      title: "Reviewer",
      dataIndex: "reviewer",
      key: "reviewer",
      width: 100,
      render: (reviewer: number) => reviewer || "Unassigned",
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
          <Button
            type="link"
            size="small"
            onClick={() => openAssignModal(record)}
          >
            Assign
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl! text-green-900 mb-4">Task Management</h1>
      <Table
        columns={columns}
        {...taskTableProps}
        rowKey="id"
        scroll={{ x: 800 }}
      />

      {/* 分配任务模态框 */}
      <Modal
        title="Assign Task"
        open={assignModalVisible}
        onOk={handleAssignTask}
        onCancel={() => setAssignModalVisible(false)}
        okText="Assign"
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
            <label className="block mb-2">Assign to User:</label>
            <Select
              style={{ width: "100%" }}
              placeholder="Select a user"
              loading={loadingUsers}
              onChange={(value) => setAssignUserId(value)}
              options={users.map((user) => ({
                label: `${user.username} (${user.role})`,
                value: user.id,
              }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
