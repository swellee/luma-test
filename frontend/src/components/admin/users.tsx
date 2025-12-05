import { api } from "@/lib/api";
import { default_avatar } from "@/lib/consts";
import { User } from "@/lib/types";
import { MoreOutlined } from "@ant-design/icons";
import { useAntdTable } from "ahooks";
import { Avatar, Dropdown } from "antd";
import Table, { ColumnsType } from "antd/es/table";

export default function AdminUsers() {
  const { tableProps: userTableProps, refresh: refreshUserTable } =
    useAntdTable(async ({ pageSize, current }) => {
      return api.user.getUserList(current, pageSize);
    });
  const columns: ColumnsType<User> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Name",
      key: "name",
      render: (item: User) => (
        <span className="flex gap-2 items-center">
          <Avatar src={item.avatar ?? default_avatar} size={26} />
          {item.username}
        </span>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "Action",
      key: "action",
      render: (item: User) => (
        <Dropdown
          menu={{
            items: [
              { key: "delete", label: "Delete" },
              {
                key: "changeRole",
                label: "Change Role",
                onClick: () => {
                  console.log(item);
                },
              },
            ],
          }}
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ), // TODO: Add detail link
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl! text-green-900 font-bold mb-4">User Management</h1>
      <Table columns={columns} {...userTableProps} />
    </div>
  );
}
