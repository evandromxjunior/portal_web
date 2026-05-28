export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCustomerDocument(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 11 || digits.length === 14;
}

export function maskDocument(value: string) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return value;
}

/** Variantes comuns de CPF/CNPJ no WINTHOR (com e sem mascara). */
export function documentLookupVariants(value: string) {
  const digits = onlyDigits(value);
  const variants = new Set<string>();

  if (!digits) {
    return [];
  }

  variants.add(digits);

  if (digits.length === 11 || digits.length === 14) {
    variants.add(maskDocument(digits));
  }

  return [...variants];
}
