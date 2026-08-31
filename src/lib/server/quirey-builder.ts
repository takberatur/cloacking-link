import { SQL, and, or, ilike, gte, lte, eq, inArray, isNull, asc, desc, count } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';

type QueryParams = {
  search?: string;
  date_from?: string;
  date_to?: string;
  include_deleted?: boolean;
  extra?: Record<string, unknown>;
  order_by?: 'asc' | 'desc' | string;
  sort_by?: string;
  page?: number | string;
  limit?: number | string;
};

type DrizzleQueryOptions<T extends PgTable> = {
  table: T;
  searchColumns?: PgColumn[];
  dateColumn?: PgColumn;
  deletedAtColumn?: PgColumn;
  customConditions?: SQL[];
  defaultSortColumn?: PgColumn;
};

type PaginatedResult<T> = {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
    limit: number;
  };
};

export class DrizzleQueryBuilder {
  /**
   * Build WHERE clause berbentuk SQL Expression Drizzle
   */
  buildWhereClause<T extends PgTable>(
    params: QueryParams,
    options: DrizzleQueryOptions<T>
  ): SQL | undefined {
    const { table, searchColumns, dateColumn, deletedAtColumn, customConditions } = options;
    const conditions: (SQL | undefined)[] = [];

    // 1. Search functionality (ILIKE multi-column)
    if (params.search && searchColumns && searchColumns.length > 0) {
      const searchPattern = `%${params.search}%`;
      const searchConditions = searchColumns.map((col) => ilike(col, searchPattern));

      if (searchConditions.length === 1) {
        conditions.push(searchConditions[0]);
      } else if (searchConditions.length > 1) {
        conditions.push(or(...searchConditions));
      }
    }

    // 2. Date Range Filter
    const targetDateCol = dateColumn || (table as any).createdAt || (table as any).created_at;
    if (targetDateCol && (params.date_from || params.date_to)) {
      if (params.date_from) {
        conditions.push(gte(targetDateCol, new Date(params.date_from)));
      }
      if (params.date_to) {
        conditions.push(lte(targetDateCol, new Date(params.date_to)));
      }
    }

    // 3. Soft Delete Handling
    const targetDeletedCol =
      deletedAtColumn || (table as any).deletedAt || (table as any).deleted_at;
    if (targetDeletedCol && !params.include_deleted) {
      conditions.push(isNull(targetDeletedCol));
    }

    // 4. Dynamic Extra Filters (key dinamis dipetakan ke kolom tabel)
    if (params.extra && typeof params.extra === 'object') {
      Object.entries(params.extra).forEach(([key, value]) => {
        const col = (table as any)[key] as PgColumn;
        if (col && value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            conditions.push(inArray(col, value));
          } else {
            conditions.push(eq(col, value));
          }
        }
      });
    }

    // 5. Inject Custom Where dari Service Level
    if (customConditions && customConditions.length > 0) {
      conditions.push(...customConditions);
    }

    // Clean undefined values & gabungkan dengan and()
    const validConditions = conditions.filter((c): c is SQL => c !== undefined);

    if (validConditions.length === 0) return undefined;
    if (validConditions.length === 1) return validConditions[0];

    return and(...validConditions);
  }

  /**
   * Build ORDER BY clause
   */
  buildOrderByClause<T extends PgTable>(
    params: QueryParams,
    options: DrizzleQueryOptions<T>
  ): SQL | undefined {
    const { table, defaultSortColumn } = options;
    const isAsc = params.order_by === 'asc';
    const sortKey = params.sort_by;

    // Jika user passing sort_by yang valid ada di kolom tabel
    if (sortKey && (table as any)[sortKey]) {
      const col = (table as any)[sortKey] as PgColumn;
      return isAsc ? asc(col) : desc(col);
    }

    // Custom Default Sort Column
    if (defaultSortColumn) {
      return isAsc ? asc(defaultSortColumn) : desc(defaultSortColumn);
    }

    // Fallback ke createdAt / created_at jika ada
    const fallbackCol = (table as any).createdAt || (table as any).created_at;
    if (fallbackCol) {
      return isAsc ? asc(fallbackCol) : desc(fallbackCol);
    }

    return undefined;
  }

  /**
   * Build Pagination Limit & Offset
   */
  buildPaginationClause(params: QueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(1, Number(params.limit) || 10), 100);
    const offset = (page - 1) * limit;

    return { limit, offset, page };
  }

  /**
   * Build Paginated Result Wrapper
   */
  buildPaginatedResult<T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalCount,
        has_next: page < totalPages,
        has_prev: page > 1,
        limit
      }
    };
  }
}
