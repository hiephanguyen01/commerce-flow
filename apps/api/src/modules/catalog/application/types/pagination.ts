export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: Pagination;
};
