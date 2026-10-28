export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function paginationMeta(input: PaginationInput, total: number): PaginationMeta {
  return { ...input, total, pages: Math.ceil(total / input.limit) };
}
