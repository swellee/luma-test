import { useUserStore } from "@/store/user_store";
import { lazy, useMemo } from "react";
const AdminTasks = lazy(() => import("@/components/admin/tasks"));
const ReviewerTasks = lazy(() => import("@/components/reviewer/tasks"));
const AnnotatorTasks = lazy(() => import("@/components/annotator/tasks"));
export default function Tasks() {
  const { user } = useUserStore();
  const component = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return <AdminTasks />;
      case "reviewer":
        return <ReviewerTasks />;
      case "annotator":
        return <AnnotatorTasks />;
      default:
        return <div>You do not have permission to view this page.</div>;
    }
  }, [user?.role]);
  return component;
}
