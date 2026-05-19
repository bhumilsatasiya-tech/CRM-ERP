export { default as companiesReducer } from './store/companiesSlice';
export {
  fetchMyCompaniesThunk,
  setActiveCompanyThunk,
  setActiveCompanyLocal,
  type CompaniesState,
} from './store/companiesSlice';

export { companyApi } from './api/companyApi';
export { branchApi } from './api/branchApi';
export { warehouseApi } from './api/warehouseApi';

export { default as CompanySwitcher } from './components/CompanySwitcher';
export { companiesPrivateRoutes } from './routes';

export type {
  Company, Branch, Warehouse,
  CompanyType, WarehouseType,
  CreateCompanyPayload, UpdateCompanyPayload,
  CreateBranchPayload, UpdateBranchPayload,
  CreateWarehousePayload, UpdateWarehousePayload,
} from './types/companies.types';
