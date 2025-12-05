import { http } from "../http";
import { CommonRes, Package, PackageListResponse, PackageReq } from "../types";

export const packages = {
  savePackage(req: PackageReq) {
    return http<Package>("/package", { data: req, method: "POST" });
  },
  publishPackage(package_id: number) {
    return http<Package>(`/package/publish/${package_id}`, { method: "POST" });
  },
  getPackageList(page: number, page_size: number) {
    return http<PackageListResponse>("/package/list", {
      params: { page, page_size },
      method: "GET",
    });
  },
  getPackageDetail(package_id: number) {
    return http<Package>("/package/" + package_id);
  },
  deletePackage(package_id: number) {
    return http<CommonRes>("/package/" + package_id, { method: "DELETE" });
  }
};
