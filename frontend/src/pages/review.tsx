import { useParams } from "react-router";
import Header from "../components/Header";
import { AnnonatePanel } from "@/components/annonate_panel";
import { useRequest } from "ahooks";
import { api } from "@/lib/api";
import { Spin } from "antd";
import { ReviewAnnotationReq, SavedAnnotation, TaskStatus } from "@/lib/types";

export default function Review() {
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

  const onSaveReview = async (review: ReviewAnnotationReq) => {
    api.task.saveReview(review);
  };
  const onCompleteReview = async (status: TaskStatus) => {
    // TODO: complete task
    api.task.updateTaskStatus({ task_id: +id!, status });
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
            viewMode
            onCompleteReview={onCompleteReview}
            onSaveReview={onSaveReview}
            description="mark all the birds in the picture"
          />
        )}
      </main>
    </div>
  );
}
