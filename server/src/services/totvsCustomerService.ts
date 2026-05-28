import { config } from "../config.js";
import { onlyDigits } from "../utils/document.js";
import { requestTotvsApi } from "./totvsApiClient.js";

type TotvsCustomer = {
  id?: number | string;
  name?: string;
  personIdentificationNumber?: string;
  active?: boolean | number;
  email?: string;
  phone?: string;
  corporatePhone?: string;
  billingPhone?: string;
  deliveryPhone?: string;
};

function normalizeCustomerPayload(payload: unknown): TotvsCustomer[] {
  if (Array.isArray(payload)) {
    return payload as TotvsCustomer[];
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;

    if (Array.isArray(objectPayload.items)) {
      return objectPayload.items as TotvsCustomer[];
    }

    return [objectPayload as TotvsCustomer];
  }

  return [];
}

export async function findTotvsCustomersByDocument(document: string) {
  const payload = await requestTotvsApi<unknown>(config.totvsApi.customerListPath, {
    query: {
      withDeliveryAddress: false,
      branchId: config.totvsApi.branchId,
      personIdentificationNumber: onlyDigits(document)
    }
  });

  return normalizeCustomerPayload(payload);
}
