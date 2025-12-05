import { useUserStore } from "@/store/user_store";
import { lazy, useMemo } from "react";
const AdminMessages = lazy(() => import("@/components/admin/messages"));
const ReviewerMessages = lazy(() => import("@/components/reviewer/messages"));
const AnnotatorMessages = lazy(() => import("@/components/annotator/messages"));
export default function Messages() {
  const { user } = useUserStore();
  const component = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return <AdminMessages />;
      case "reviewer":
        return <ReviewerMessages />;
      case "annotator":
        return <AnnotatorMessages />;
      default:
        return <div>You do not have permission to view this page.</div>;
    }
  }, [user?.role]);
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Messages</h1>
      {component}
    </div>
  );
}
