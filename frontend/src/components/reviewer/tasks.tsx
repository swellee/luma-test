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
  Radio,
  Tabs,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { useUserStore } from "@/store/user_store";
import { EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { router_review } from "@/lib/consts";
import { useNavigate } from "react-router";
import { getStatusTag } from "@/lib/util";

export default function ReviewerTasks() {
  const { user } = useUserStore();

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

  const navigate = useNavigate();
  const handleEdit = (task: Task) =>
    navigate(router_review.replace(":id", task.id.toString()));
  const handleApprove = async (task: Task) => {
    try {
      await api.task.updateTaskStatus({
        task_id: task.id,
        status: TaskStatus.approved,
      });
      message.success("Task completed successfully");
      refreshMyTasks();
    } catch (error) {
      message.error("Failed to complete task");
    }
  };
  const handleReject = async (task: Task) => {
    try {
      await api.task.updateTaskStatus({
        task_id: task.id,
        status: TaskStatus.rejected,
      });
      message.success("Task rejected successfully");
      refreshMyTasks();
    } catch (error) {
      message.error("Failed to reject task");
    }
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
            icon={<EditOutlined />}
            size="small"
            disabled={record.status !== TaskStatus.reviewing}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={
              <div className="w-50">
                Are you sure you want to mark this task as approved? you will no
                longer to edit it then
              </div>
            }
            onConfirm={() => handleApprove(record)}
          >
            <Button
              disabled={record.status !== TaskStatus.reviewing}
              icon={<CheckOutlined />}
              className="ml-4"
              size="small"
              danger
            />
          </Popconfirm>
          <Popconfirm
            title={
              <div className="w-50">
                Are you sure you want to mark this task as rejected? you will no
                longer to edit it then
              </div>
            }
            onConfirm={() => handleReject(record)}
          >
            <Button
              disabled={record.status !== TaskStatus.reviewing}
              icon={<CloseOutlined />}
              className="ml-4"
              size="small"
              danger
            />
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
    </div>
  );
}
