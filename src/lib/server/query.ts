import type { RequestEvent } from '@sveltejs/kit';
import {
  eq,
  and,
  or,
  gte,
  lte,
  inArray,
  asc,
  desc,
  ilike,
  isNull,
  type SQL,
  type Column
} from 'drizzle-orm';
import { ServerBase } from './server.js';
import { formatToPostgresTimestampV2 } from '$lib/utils/time.js'

export class QueryHelper extends ServerBase {
  private whereConditions: SQL[] = [];
  private defaultTable?: any;

  constructor(event: RequestEvent, table?: any) {
    super(event);
    this.defaultTable = table;
  }
  private resolveColumn(field: Column | string, table?: any): Column | null {
    if (typeof field === 'string') {
      const targetTable = table || this.defaultTable;
      if (targetTable && targetTable[field]) {
        return targetTable[field] as Column;
      }
      console.warn(`[QueryHelper] Field '${field}' tidak ditemukan pada tabel.`);
      return null;
    }
    return field as Column;
  }
  addSearch(search: string | null | undefined, fields: SearchFieldConfig[], table?: any): this {
    if (!search || search.trim() === '') return this;

    const searchConditions: SQL[] = [];
    const cleanSearch = search.trim();

    for (const config of fields) {
      if (config.searchable === false) continue;

      const col = this.resolveColumn(config.field, table);
      if (!col) continue;

      switch (config.type) {
        case 'string':
          // Case-insensitive search menggunakan ILIKE
          searchConditions.push(ilike(col, `%${cleanSearch}%`));
          break;

        case 'number':
          const searchAsNumber = parseInt(cleanSearch, 10);
          if (!isNaN(searchAsNumber)) {
            searchConditions.push(eq(col, searchAsNumber));
          }
          break;

        case 'date':
          const searchAsDate = new Date(cleanSearch);
          if (!isNaN(searchAsDate.getTime())) {
            const startOfDay = new Date(searchAsDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(searchAsDate);
            endOfDay.setHours(23, 59, 59, 999);

            searchConditions.push(and(gte(col, startOfDay), lte(col, endOfDay))!);
          }
          break;

        case 'boolean':
          const searchLower = cleanSearch.toLowerCase();
          if (['true', '1', 'yes'].includes(searchLower)) {
            searchConditions.push(eq(col, true));
          } else if (['false', '0', 'no'].includes(searchLower)) {
            searchConditions.push(eq(col, false));
          }
          break;
      }
    }

    if (searchConditions.length > 0) {
      const combined = or(...searchConditions);
      if (combined) {
        this.whereConditions.push(combined);
      }
    }

    return this;
  }
  addFilter(
    field: Column | string,
    value: any,
    operator: 'equals' | 'in' | 'contains' = 'equals',
    table?: any
  ): this {
    if (value === undefined || value === null || value === '') return this;

    const col = this.resolveColumn(field, table);
    if (!col) return this;

    switch (operator) {
      case 'equals':
        this.whereConditions.push(eq(col, value));
        break;
      case 'in':
        const arrayValue = Array.isArray(value) ? value : [value];
        if (arrayValue.length > 0) {
          this.whereConditions.push(inArray(col, arrayValue));
        }
        break;
      case 'contains':
        this.whereConditions.push(ilike(col, `%${value}%`));
        break;
    }

    return this;
  }
  addDateRange(
    field: Column | string,
    from?: string | Date,
    to?: string | Date,
    table?: any
  ): this {
    if (!from && !to) return this;

    const col = this.resolveColumn(field, table);
    if (!col) return this;

    if (from) {
      this.whereConditions.push(gte(col, new Date(from)));
    }

    if (to) {
      this.whereConditions.push(lte(col, new Date(to)));
    }

    return this;
  }
  addNumberRange(field: Column | string, min?: number, max?: number, table?: any): this {
    if (min === undefined && max === undefined) return this;

    const col = this.resolveColumn(field, table);
    if (!col) return this;

    if (min !== undefined) {
      this.whereConditions.push(gte(col, min));
    }

    if (max !== undefined) {
      this.whereConditions.push(lte(col, max));
    }

    return this;
  }
  addCondition(condition: SQL | undefined | null): this {
    if (condition) {
      this.whereConditions.push(condition);
    }
    return this;
  }

  excludeDeleted(field: Column | string = 'deletedAt', table?: any): this {
    const col = this.resolveColumn(field, table);
    if (col) {
      this.whereConditions.push(isNull(col));
    }
    return this;
  }
  build(): SQL | undefined {
    if (this.whereConditions.length === 0) {
      return undefined;
    }

    return and(...this.whereConditions);
  }
  buildOrderBy(field: Column | string, orderBy: 'asc' | 'desc' = 'desc', table?: any) {
    const col = this.resolveColumn(field, table);
    if (!col) return undefined;

    return orderBy === 'asc' ? asc(col) : desc(col);
  }
  buildPagination(page: number = 1, limit: number = 10): { limit: number; offset: number } {
    const offset = Math.max(0, (page - 1) * limit);
    return { limit, offset };
  }
  buildPaginatedResult<T>(data: T[], totalCount: number, page: number, limit: number) {
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
  parseQueryParams(url: URL): QueryParams {
    const params = url.searchParams;
    const defaultDateRange = this.getDefaultDateRange();

    return {
      page: parseInt(params.get('page') || '1', 10),
      limit: parseInt(params.get('limit') || '10', 10),
      search: params.get('search') || undefined,
      sort_by: params.get('sort_by') || 'createdAt',
      order_by: (params.get('order_by') as 'asc' | 'desc') || 'desc',
      date_from: params.get('date_from') || defaultDateRange.start,
      date_to: params.get('date_to') || defaultDateRange.end,
      extra: {}
    };
  }
  getDefaultDateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
  getPrevoiusPeriod(dateFrom: string, dateTo: string): { start: string; end: string } {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    const timeDiff = end.getTime() - start.getTime();

    const previoudDateStart = new Date(start.getTime() - timeDiff - 1);
    const previoudDateEnd = new Date(start.getTime() - 1);

    return {
      start: formatToPostgresTimestampV2(previoudDateStart),
      end: formatToPostgresTimestampV2(previoudDateEnd)
    };
  }

  clone(): QueryHelper {
    const clone = new QueryHelper(this.event, this.defaultTable);
    clone.whereConditions = [...this.whereConditions];
    return clone;
  }
}
