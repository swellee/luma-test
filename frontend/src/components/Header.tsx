import { Layout, Button, Avatar, Dropdown, Badge, notification } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useUserStore } from "@/store/user_store";
import {
  apiHost,
  router_login,
  router_profile,
  router_dashboard_messages,
  router_dashboard,
  default_avatar,
} from "../lib/consts";
import { Link, useNavigate } from "react-router";
import "./Header.scss";
import { useEffect } from "react";
import { EventSourcePolyfill } from "event-source-polyfill";

import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { cn } from "../lib/util";

const { Header: AntHeader } = Layout;

export default function Header({ className }: { className?: string }) {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const goLogin = () => {
    navigate(router_login);
  };
  const logoutAndGoHome = () => {
    logout();
    navigate("/");
  };
  const { data: unread = { count: 0 }, mutate } = useRequest(
    api.msg.getSysMsgUnreadCount,
    { ready: !!user }
  );

  const connectSSE = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const source = new EventSourcePolyfill(`${apiHost}/sysmsg/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    source.onopen = () => {
      console.log("sse connected!");
    };

    source.onmessage = (e: any) => {
      let msg: Record<string, any>;
      if (e.data === "heartbeat") {
        return;
      }
      try {
        msg = JSON.parse(e.data);
      } catch (err) {
        console.log("sse error:", err);
        return;
      }

      if (msg.title) {
        notification.info({
          title: msg.title,
          placement: "topRight",
          duration: 2,
          key: Date.now().toString(),
          style: { maxWidth: 360, zIndex: 99999 },
        });
        mutate({ count: unread.count + 1 });
      }
    };

    source.onerror = (err: any) => {
      console.log("sse There was an error from server", err);
    };
    source.addEventListener("close", (err: any) => {
      console.log("sse connection closed by the server");
    });

    return () => {
      source.close();
    };
  };

  useEffect(() => {
    if (user) {
      return connectSSE();
    }
  }, [user]);

  const userMenuItems = [
    {
      key: "dashboard",
      label: <Link to={router_dashboard}>Dashboard</Link>,
    },
    {
      key: "profile",
      label: <Link to={router_profile}>Profile</Link>,
    },
    {
      key: "message",
      label: <Link to={router_dashboard_messages}>Messages</Link>,
    },
    {
      key: "logout",
      label: <span onClick={logoutAndGoHome}>Logout</span>,
    },
  ];

  return (
    <AntHeader
      className={cn(
        "w-screen overflow-x-hidden border-b p-2! bg-black! h-14 flex items-center",
        className
      )}
    >
      <div className="flex items-center w-full px-6">
        <Link
          to="/"
          className="text-3xl font-bold text-sky-200! mr-3 md:mr-8 relative z-2"
        >
          Luma Labs
        </Link>
        {user?.username && (
          <div className="ml-auto text-gray-500">
            <div >{user?.username}</div>
          </div>
        )}
        <div className={cn("flex items-center gap-4", user?.username ? "ml-2" : "ml-auto")}>
          {!user ? (
            <Button type="text" onClick={goLogin}>
              登录/注册
            </Button>
          ) : (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Badge count={unread.count} size="small" offset={[0, 0]}>
                <Avatar
                  size="large"
                  className="mr-4 bg-sky-600 cursor-pointer bordered border-green-950/80!"
                  icon={<UserOutlined />}
                  src={user?.avatar || default_avatar}
                />
              </Badge>
            </Dropdown>
          )}
        </div>
      </div>
    </AntHeader>
  );
}
