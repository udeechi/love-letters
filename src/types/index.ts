export interface Notebook {
  id: string;
  title: string;
  password_hash: string;
  created_at: string;
}

export interface NotebookPage {
  id: string;
  notebook_id: string;
  page_number: number;
  content: string;
  images: PageImage[];
  created_at: string;
  updated_at: string;
}

export interface PageImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  caption?: string;
}

export interface AuthPayload {
  notebookId: string;
  role: "editor";
  iat: number;
  exp: number;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface PagesResponse {
  pages: NotebookPage[];
}

export interface PageResponse {
  page: NotebookPage;
}

export interface UploadResponse {
  url: string;
  public_id: string;
  width: number;
  height: number;
}
