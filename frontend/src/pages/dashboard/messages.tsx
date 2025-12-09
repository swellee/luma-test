import { useUserStore } from "@/store/user_store";
import { api } from "@/lib/api";
import { SysMsg } from "@/lib/types";
import { useAntdTable } from "ahooks";
import { Button, Modal, Select, Tag } from "antd";
import Table, { ColumnsType } from "antd/es/table";
import { useState } from "react";

export default function Messages() {
  const [status, setStatus] = useState<"read" | "unread" | ''>("");
  const {refreshUnreadMsgCount} = useUserStore();
  const [showInfo, setShowInfo] = useState<SysMsg | undefined>();
  const { tableProps, refresh } = useAntdTable(
    async ({ current, pageSize }) => {
      refreshUnreadMsgCount();
      return await api.msg.getSysMsgList({
        status: status || undefined,
        page: current,
        page_size: pageSize,
      });
    }, { refreshDeps: [status]}
  );

  const columns: ColumnsType<SysMsg> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Content",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "read" ? "green" : "orange"}>-</Tag>
      ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      ellipsis: true,
    },
    {
      title: "详情",
      key: "action",
      render: (_, record) => (
        <Button type="link" onClick={() => setShowInfo(record)}>
          查看
        </Button>
      ),
    },
  ];

  const markAllRead = () => api.msg.markAllRead();
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-full flex items-center gap-4">
        <h1 className="text-2xl! text-green-900 mb-4">Messages</h1>
        <span className="ml-auto text-green-700">Filter By:</span>
        <Select
          options={[
            { label: "read", value: "read" },
            { label: "unread", value: "unread" },
            { label: "all", value: '' },
          ]}
          onChange={setStatus}
          value={status}
          className="w-30"
        />

        <Button onClick={markAllRead}>Mark all Read</Button>
      </div>
      <Table {...tableProps} columns={columns} rowKey="id" />
      <Modal
        title="Message Info"
        open={!!showInfo}
        onCancel={async () => {
          await api.msg.markSysMsgAsRead({ ids: [showInfo?.id!] });
          setShowInfo(undefined);
          refresh();
        }}
        footer={null}
        centered
      >
        <p>Title: {showInfo?.title}</p>
        <p>Content: {showInfo?.content}</p>
        <p>Created At: {showInfo?.created_at}</p>
      </Modal>
    </div>
  );
}
