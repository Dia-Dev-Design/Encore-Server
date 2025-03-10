export function calcPagination(page: number, limit: number): number {
  const skipPages = page && limit ? (page - 1) * limit : undefined;

  return skipPages;
}
