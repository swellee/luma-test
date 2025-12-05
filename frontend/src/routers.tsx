import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { Button, Spin } from "antd";

import { lazy, Suspense, useEffect } from "react";
import {
  router_home,
  router_login,
  router_register,
  router_profile,
  router_terms,
  router_reset_password,
  router_dashboard,
  router_dashboard_users,
  router_dashboard_messages,
  router_dashboard_packages,
  router_dashboard_packages_edit,
  router_dashboard_tasks,
} from "./lib/consts";
import { useUserStore } from "./store/user_store";
import ErrorBoundary from "antd/es/alert/ErrorBoundary";
const Home = lazy(() => import("./pages/home"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const DashboardUsers = lazy(() => import("./components/admin/users"));
const DashboardPackages = lazy(() => import("./pages/dashboard/packages"));
const DashboardPackageEdit = lazy(() => import("./components/admin/package_edit"));
const DashboardTasks = lazy(() => import("./pages/dashboard/tasks"));
const DashboardMessages = lazy(() => import("./pages/dashboard/messages"));
const Register = lazy(() => import("./pages/register"));
const Profile = lazy(() => import("./pages/profile"));
const Login = lazy(() => import("./pages/login"));
const NotFound = lazy(() => import("./pages/404"));
const Terms = lazy(() => import("./pages/terms"));
const ResetPassword = lazy(() => import("./pages/reset_password"));

// 路由保护组件
const AuthGuard = ({
  element,
  auth,
}: {
  element: React.ReactElement;
  auth?: boolean;
}) => {
  const token = localStorage.getItem("token");
  const targetPath = window.location.href.replace(window.location.origin, "");
  if (auth && !token) {
    return (
      <Navigate
        to={`${router_login}${targetPath ? `?to=${targetPath}` : ""}`}
        replace
      />
    );
  }

  return element;
};

// define refactored routers here
export const routers = [
  {
    path: router_login,
    element: <AuthGuard element={<Login />} auth={false} />,
  },
  {
    path: router_register,
    element: <AuthGuard element={<Register />} auth={false} />,
  },
  {
    path: router_profile,
    element: <AuthGuard element={<Profile />} auth={true} />,
  },
  {
    path: router_terms,
    element: <Terms />, // no auth guard
  },
  {
    path: router_reset_password,
    element: <ResetPassword />, // no auth guard
  },
  {
    path: router_home,
    element: <Home />, // no auth guard
  },
  {
    path: router_dashboard,
    element: <AuthGuard element={<Dashboard />} auth={true} />,
    children: [
      {
        path: router_dashboard_users,
        element: <DashboardUsers />,
      },
      {
        path: router_dashboard_packages,
        element: <DashboardPackages />,
      },
      {
        path: router_dashboard_packages_edit,
        element: <DashboardPackageEdit />,
      },
      {
        path: router_dashboard_tasks,
        element: <DashboardTasks />,
      },
      {
        path: router_dashboard_messages,
        element: <DashboardMessages />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

const router = createBrowserRouter(routers);

// 页面刷新函数
const reloadPage = () => {
  window.location.reload();
};

export const AppRouter = () => {
  const checkAuthStatus = useUserStore((state) => state.checkAuthStatus);
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <div className="w-screen h-screen">
      <ErrorBoundary
        description={<Button onClick={reloadPage}>点我刷新</Button>}
      >
        <Suspense
          fallback={
            <Spin
              spinning
              className="suspense-spin fixed top-[50vh] left-[50vw]"
            />
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
