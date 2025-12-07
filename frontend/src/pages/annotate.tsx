import { useParams } from "react-router";
import Header from "../components/Header";
import { AnnonatePanel } from "@/components/annonate_panel";
import { useRequest } from "ahooks";
import { api } from "@/lib/api";
import { Spin } from "antd";
import { SavedAnnotation, TaskStatus } from "@/lib/types";

export default function Annotate() {
  const { id } = useParams();
  const { data: pageData } = useRequest(
    async () => {
      const res = await api.task.getTaskDetail(+id!);
      const packageRes = await api.packages.getPackageDetail(res.packageId);
      return {
        task: res,
        package: packageRes,
      };
    },
    {
      ready: !!id,
      refreshDeps: [id],
    }
  );

  const onSaveAnnotation = async (annotation: SavedAnnotation) => {
    api.task.saveAnnotation(annotation);
  };
  const onCompleteTask = async (taskId: number) => {
    // TODO: complete task
    api.task.updateTaskStatus({task_id: taskId, status:TaskStatus.processed});
  };
  return (
    <div className="flex flex-col gap-4">
      <Header />
      <main>
        {!pageData?.package ? (
          <Spin spinning />
        ) : (
          <AnnonatePanel
            bucketId={pageData!.package.bucketId}
            list={pageData!.package.items}
            current={pageData?.task.wipIdx}
            taskId={pageData?.task.id}
            onCompleteAnnotate={onCompleteTask}
            onSaveAnnotation={onSaveAnnotation}
            description="mark all the birds in the picture"
          />
        )}
      </main>
    </div>
  );
}
