export enum Role {
  ADMIN = "admin",
  ANNOTATOR = "annotator",
  REVIEWER = "reviewer",
}

export type UserCreateReq = {
  username: string;
  email: string;
  role: Role;
  password: string;
};
export type User = Omit<UserCreateReq,"password"> & { id: number, avatar?: string };
export type UserUpdateReq = User;
export type UserLoginRes = {user: User, token: string };
export type BucketAccess = {
  key: string;
  secret: string;
};
export type BucketReq = {
  id: number;
  name: string;
  region: string;
  path_mode: boolean;
  access: BucketAccess;
};

export type ListBucketRes = {
  list: Omit<Bucket, 'access'>[];
  total: number;
}
export enum PackageStatus {
  // TODO: add more statuses
  PENDING = "pending",
  PUBLISHED = "published",
}

export type Package = {
  id: number;
  bucketId: number;
  name: string;
  items: string[];// list of s3 object keys
  status: PackageStatus;
};

export enum TaskStatus {
  created = "created",
  processing = "processing",
  approved = "approved",
  rejected = "rejected",
}
export type Task = {
  id: number;
  name: string;
  packageId: number;
  assignedTo: number; // user id
  status: TaskStatus;
};
export type Bucket = BucketReq & { id: number };

export type FileUploadRes = {
  url: string;
  key: string;
  hash: string;
};
export type CommonRes = {
  success: boolean;
};

export type SysMsg = {
  id: number;
  title: string;
  content: string;
  status: "read" | "unread";
  created_at: string;
};

export type SysMsgListRes = {
  list: SysMsg[];
  total: number;
};

export type SysMsgUnreadCountRes = {
  count: number;
};

export type UserListRes = {
  list: User[];
  total: number;
}

export type PackageReq = Omit<Package,'id'|'status'> & {
  id?: number;
}
export type PackageItem = Omit<Package, "items">;
export type PackageListResponse = {
  list: PackageItem[];
  total: number;
}

export type ObjectInfo = {
  key: string;
  name: string;
  type: string; // "image" or "video"
  size: number;
  last_modified: string;
}
