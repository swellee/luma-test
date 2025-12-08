import {
  router_dashboard,
  router_dashboard_messages,
  router_dashboard_packages,
  router_dashboard_tasks,
  router_dashboard_users,
} from "@/lib/consts";
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

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user]);

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
          {
            key: router_dashboard_messages,
            label: "Messages",
            icon: <MessageOutlined />,
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

  useEffect(() => {
    if (navMenuItems.length > 0 && window.location.pathname == router_dashboard)
      onClickNav({ key: navMenuItems[0].key });
  }, [navMenuItems]);
  return (
    <Layout className="flex flex-col h-screen bg-sky-50!">
      <Header />
      <div className="flex-1 flex">
        <aside>
          <Menu
            onClick={onClickNav}
            defaultSelectedKeys={[navMenuItems?.[0]?.key]}
            defaultOpenKeys={["sub1"]}
            mode="inline"
            className="p-4! border-r-0! h-full"
            items={navMenuItems}
          />
        </aside>
        <section className="flex-1 bg-black">
          <Outlet />
        </section>
      </div>
    </Layout>
  );
}
