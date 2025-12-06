import { api } from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";
import { useAntdTable } from "ahooks";
import {
  Button,
  Table,
  Tag,
  message,
  Space,
  Modal,
  Tabs,
  Dropdown,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useUserStore } from "@/store/user_store";
import { CheckSquareFilled, PlayCircleTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { routr_annotate } from "@/lib/consts";

export default function AnnotatorTasks() {
  const { user } = useUserStore();
  const navigate = useNavigate();

  // 获取可领取的任务列表（created 状态且未分配）
  const {
    tableProps: availableTaskTableProps,
    refresh: refreshAvailableTasks,
  } = useAntdTable(async ({ pageSize, current }) => {
    const response = await api.task.getTaskList({
      page: current,
      page_size: pageSize,
      status: TaskStatus.created,
      user_id: 0, // 获取未分配的任务
    });
    return {
      list: response.list.filter((task) => task.annotator === 0),
      total: response.list.filter((task) => task.annotator === 0).length,
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

  const handleProceedTask = async (task: Task) => {
    navigate(routr_annotate.replace(':id', task.id.toString()));
  };

  // 确认完成任务
  const handleConfirmComplete = async (record: Task) => {
    try {
      await api.task.updateTaskStatus({
        task_id: record.id,
        status: TaskStatus.processed,
      });
      message.success("Task completed successfully");
      refreshMyTasks();
    } catch (error) {
      message.error("Failed to complete task");
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
        <span>
          <Button
            icon={<PlayCircleTwoTone />}
            size="small"
            onClick={() => handleProceedTask(record)}
          />
          <Popconfirm
            title="Are you sure you want to mark this task as completed? This task will go to reviewers"
            onConfirm={() => handleConfirmComplete(record)}
          >
            <Button icon={<CheckSquareFilled />} size="small" danger />
          </Popconfirm>
        </span>
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
                rowKey="id"
              />
            ),
          },
          {
            label: "Claimable Tasks",
            key: "2",
            children: (
              <Table
                columns={availableColumns}
                {...availableTaskTableProps}
                rowKey="id"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
