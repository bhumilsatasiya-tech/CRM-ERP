import { apiClient } from '../../01-auth/api/axiosInstance';
import { cachedFetch, cachedList, invalidate } from '../../common/lookupCache';
import { invalidateStore } from '../../../app/lookupStore';
import type {
  CreateCategoryPayload, CreateProductPayload, CreateUnitPayload, CreateUomConversionPayload,
  Product, ProductCategory, ProductUnit, ProductUomConversion,
  UpdateProductPayload,
} from '../types/products.types';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

const flushProductCaches = () => {
  invalidate('lookup:products');
  invalidate('list:products');
  invalidateStore('products');
};

export const productApi = {
  list: (params: { search?: string; type?: string; category_id?: number; is_active?: boolean; page?: number; per_page?: number; sort?: string } = {}) =>
    cachedList('list:products', params, () => apiClient.get<PaginatedEnvelope<Product>>('/products', { params }).then((r) => r.data)),
  get: (id: number) =>
    apiClient.get<{ data: Product }>(`/products/${id}`).then((r) => r.data.data),
  create: (payload: CreateProductPayload) =>
    apiClient.post<{ data: Product }>('/products', payload).then((r) => { flushProductCaches(); return r.data.data; }),
  update: (id: number, payload: UpdateProductPayload) =>
    apiClient.put<{ data: Product }>(`/products/${id}`, payload).then((r) => { flushProductCaches(); return r.data.data; }),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/products/${id}`).then((r) => { flushProductCaches(); return r.data.data; }),
  lookup: (q: string, type?: string, categoryId?: number, limit = 10, offset = 0) => {
    const key = `lookup:products:t=${type ?? ''}:c=${categoryId ?? ''}:q=${q}:o=${offset}:l=${limit}`;
    return cachedFetch(key, () =>
      apiClient.get<{ data: Partial<Product>[] }>('/lookup/products', { params: { q, type, category_id: categoryId, limit, offset } }).then((r) => r.data.data),
    );
  },
};

export const categoryApi = {
  list: (params: { search?: string } = {}) =>
    apiClient.get<{ data: ProductCategory[] }>('/product-categories', { params }).then((r) => r.data.data),
  create: (payload: CreateCategoryPayload) =>
    apiClient.post<{ data: ProductCategory }>('/product-categories', payload).then((r) => { invalidate('lookup:categories'); invalidateStore('categories'); return r.data.data; }),
  update: (id: number, payload: Partial<CreateCategoryPayload>) =>
    apiClient.put<{ data: ProductCategory }>(`/product-categories/${id}`, payload).then((r) => { invalidate('lookup:categories'); invalidateStore('categories'); return r.data.data; }),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/product-categories/${id}`).then((r) => { invalidate('lookup:categories'); invalidateStore('categories'); return r.data.data; }),
  lookup: (q: string, limit = 10, offset = 0) => {
    const key = `lookup:categories:q=${q}:o=${offset}:l=${limit}`;
    return cachedFetch(key, () =>
      apiClient.get<{ data: Partial<ProductCategory>[] }>('/lookup/product-categories', { params: { q, limit, offset } }).then((r) => r.data.data),
    );
  },
};

export const unitApi = {
  list: (params: { search?: string; type?: string } = {}) =>
    apiClient.get<{ data: ProductUnit[] }>('/product-units', { params }).then((r) => r.data.data),
  create: (payload: CreateUnitPayload) =>
    apiClient.post<{ data: ProductUnit }>('/product-units', payload).then((r) => { invalidate('lookup:units'); invalidateStore('units'); return r.data.data; }),
  update: (id: number, payload: Partial<CreateUnitPayload>) =>
    apiClient.put<{ data: ProductUnit }>(`/product-units/${id}`, payload).then((r) => { invalidate('lookup:units'); invalidateStore('units'); return r.data.data; }),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/product-units/${id}`).then((r) => { invalidate('lookup:units'); invalidateStore('units'); return r.data.data; }),
  lookup: (q: string, type?: string, limit = 10, offset = 0) => {
    const key = `lookup:units:t=${type ?? ''}:q=${q}:o=${offset}:l=${limit}`;
    return cachedFetch(key, () =>
      apiClient.get<{ data: Partial<ProductUnit>[] }>('/lookup/product-units', { params: { q, type, limit, offset } }).then((r) => r.data.data),
    );
  },
};

export const uomConversionApi = {
  list: (productId: number) =>
    apiClient.get<{ data: ProductUomConversion[] }>(`/products/${productId}/uom-conversions`).then((r) => r.data.data),
  create: (productId: number, payload: CreateUomConversionPayload) =>
    apiClient.post<{ data: ProductUomConversion }>(`/products/${productId}/uom-conversions`, payload).then((r) => r.data.data),
  update: (id: number, payload: CreateUomConversionPayload) =>
    apiClient.put<{ data: ProductUomConversion }>(`/product-uom-conversions/${id}`, payload).then((r) => r.data.data),
  remove: (id: number) =>
    apiClient.delete<{ data: { message: string } }>(`/product-uom-conversions/${id}`).then((r) => r.data.data),
};
