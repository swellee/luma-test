import { router_dashboard_messages, router_dashboard_packages, router_dashboard_tasks, router_dashboard_users } from "@/lib/consts";
import { useUserStore } from "@/store/user_store";
import { Layout, Menu } from "antd";
import { useEffect, useMemo } from "react";
import {
  UserOutlined,
  FolderOutlined,
  FileOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router";
import Header from "@/components/Header";

export default function Dashboard() {
  const { user, checkAuthStatus } = useUserStore();
  const navigate = useNavigate();

  const onClickNav = ({ key }: { key: string }) => {
    navigate(key);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const navMenuItems = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return [
          {
            key: router_dashboard_users,
            label: "Users",
            icon: <UserOutlined />,
          },
          {
            key: router_dashboard_packages,
            label: "Packages",
            icon: <FolderOutlined />,
          },
          {
            key: router_dashboard_tasks,
            label: "Tasks",
            icon: <FileOutlined />,
          },
        ];
      case "reviewer":
        return [
          {
            key: router_dashboard_tasks,
            label: "Tasks",
            icon: <FileOutlined />,
          },
          {
            key: router_dashboard_messages,
            label: "Messages",
            icon: <MessageOutlined />,
          },
        ];
      case "annotator":
        return [
          {
            key: router_dashboard_tasks,
            label: "Tasks",
            icon: <FileOutlined />,
          },
          {
            key: router_dashboard_messages,
            label: "Messages",
            icon: <MessageOutlined />,
          },
        ];
      default:
        return [];
    }
  }, [user?.role]);
  return (
    <Layout className="flex flex-col h-screen bg-sky-50!" >
      <Header />
      <div className="flex-1 flex">
      <aside className="bg-sky-200!">
        <Menu
          onClick={onClickNav}
          defaultSelectedKeys={["1"]}
          defaultOpenKeys={["sub1"]}
          mode="inline"
          className="border-r-0!"
          items={navMenuItems}
        />
      </aside>
      <section className="flex-1">
        <Outlet />
      </section>
      </div>
    </Layout>
  );
}
