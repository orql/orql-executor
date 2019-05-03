export interface User {
  id?: number;
  name?: string;
  password?: string;
  deleted?: boolean;
  createAt?: Date;
  role?: Role;
  posts?: Post[];
  info?: UserInfo;
}

export interface Role {
  id?: number;
  name?: string;
}

export interface UserInfo {
  id?: number;
  avatar?: string;
  user?: User;
}

export interface Post {
  id?: number;
  title?: string;
  content?: string;
  author?: User;
  tags?: Tag[]
}

export interface Tag {
  id?: number;
  name?: string;
  posts?: Post[];
}

export interface PostTag {
  post: Post;
  tag: Tag;
}