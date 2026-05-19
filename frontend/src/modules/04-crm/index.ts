export { partnerApi, partnerContactApi, partnerAddressApi, partnerBankApi } from './api/partnerApi';
export { crmPrivateRoutes } from './routes';
export type {
  Partner, PartnerContact, PartnerAddress, PartnerBankAccount,
  PartnerType, TaxTreatment, Segment, AddressType,
  CreatePartnerPayload, UpdatePartnerPayload,
  CreatePartnerContactPayload, CreatePartnerAddressPayload, CreatePartnerBankPayload,
} from './types/crm.types';
