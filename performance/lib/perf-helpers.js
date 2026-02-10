import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { app } from './config.js';

export const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const pickRandom = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  return values[Math.floor(Math.random() * values.length)];
};

const readProductIdsFromCsv = (csvPath) => {
  try {
    const resolvedPath =
      import.meta && typeof import.meta.resolve === 'function'
        ? import.meta.resolve(csvPath)
        : csvPath;
    const csv = open(resolvedPath);
    const rows = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length <= 1) {
      return [];
    }

    const ids = [];
    for (let i = 1; i < rows.length; i += 1) {
      const [rawId] = rows[i].split(',');
      const parsedId = Number(rawId);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        ids.push(parsedId);
      }
    }

    return ids;
  } catch (_error) {
    return [];
  }
};

const buildProductIdRange = (minId, maxId) => {
  const ids = [];
  for (let id = minId; id <= maxId; id += 1) {
    ids.push(id);
  }
  return ids;
};

export const createProductPool = ({
  sharedArrayName,
  productMin,
  productMax,
  csvPath = '../data/products.csv'
}) => {
  const productIdsFromCsv = new SharedArray(sharedArrayName, () => readProductIdsFromCsv(csvPath));
  const fallbackProductIds = buildProductIdRange(productMin, productMax);
  const preferredIds = productIdsFromCsv.length > 0 ? productIdsFromCsv : fallbackProductIds;

  return {
    productIdsFromCsv,
    fallbackProductIds,
    preferredIds,
    getSourceLabel: () =>
      productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${productMin}-${productMax})`,
    pickProductId: () => pickRandom(preferredIds),
    pickProductIdFrom: (preferredCandidates) => {
      if (Array.isArray(preferredCandidates) && preferredCandidates.length > 0) {
        return pickRandom(preferredCandidates);
      }
      return pickRandom(preferredIds);
    }
  };
};

export const parseProductsPayload = (res) => {
  if (!res || res.status !== 200) {
    return [];
  }

  try {
    const body = res.json();
    if (!body || body.ok !== true || !Array.isArray(body.products)) {
      return [];
    }
    return body.products;
  } catch (_error) {
    return [];
  }
};

export const getInStockPreferredIds = (products, preferredIds) => {
  const preferredSet = new Set((preferredIds || []).map((id) => Number(id)));
  const inStock = [];

  for (let i = 0; i < products.length; i += 1) {
    const item = products[i] || {};
    const id = Number(item.id);
    const stock = Number(item.stock);

    if (Number.isInteger(id) && preferredSet.has(id) && Number.isFinite(stock) && stock > 0) {
      inStock.push(id);
    }
  }

  return inStock;
};

export const getInStockAnyIds = (products) => {
  const inStock = [];

  for (let i = 0; i < products.length; i += 1) {
    const item = products[i] || {};
    const id = Number(item.id);
    const stock = Number(item.stock);

    if (Number.isInteger(id) && Number.isFinite(stock) && stock > 0) {
      inStock.push(id);
    }
  }

  return inStock;
};

export const fetchTargetProductIds = (preferredIds, options = {}) => {
  const tag = options.tag || 'products_list';

  const productsRes = http.get(`${app.baseURL}/api/products`, {
    redirects: 0,
    tags: { endpoint: tag }
  });

  const products = parseProductsPayload(productsRes);
  if (products.length === 0) {
    return [];
  }

  const preferredInStock = getInStockPreferredIds(products, preferredIds);
  if (preferredInStock.length > 0) {
    return preferredInStock;
  }

  return getInStockAnyIds(products);
};

export const resetStockIfNeeded = ({ enabled, resetKey, endpoint = 'reset_stock' }) => {
  if (!enabled) {
    return;
  }

  if (!resetKey) {
    console.warn('[Setup] PERF_RESET_STOCK=true but RESET_KEY is missing. Skipping stock reset.');
    return;
  }

  const resetRes = http.post(`${app.baseURL}/api/products/reset-stock`, null, {
    headers: { 'X-RESET-KEY': resetKey },
    redirects: 0,
    tags: { endpoint },
    responseCallback: http.expectedStatuses(200, 403)
  });

  if (resetRes.status === 200) {
    console.log('[Setup] Stock reset completed.');
    return;
  }

  console.warn(`[Setup] Stock reset returned status=${resetRes.status}. Continuing without reset.`);
};

export const getLocation = (res) => {
  return String((res && (res.headers.Location || res.headers.location)) || '');
};

export const isAuthRedirect = (res, loginPath = '/login') => {
  if (!res || (res.status !== 302 && res.status !== 303)) {
    return false;
  }
  return getLocation(res).includes(loginPath);
};

export const isAuthFailureResponse = (res, loginPath = '/login') => {
  if (!res) {
    return false;
  }
  return res.status === 401 || isAuthRedirect(res, loginPath);
};

export const isCartRedirect = (res, cartErrorPath = '/cart?error=') => {
  if (!res || (res.status !== 302 && res.status !== 303)) {
    return false;
  }
  return getLocation(res).includes(cartErrorPath);
};

export const isStockLimitResponse = (res, options = {}) => {
  const cartErrorPath = options.cartErrorPath || '/cart?error=';

  if (!res) {
    return false;
  }

  if (isCartRedirect(res, cartErrorPath)) {
    return getLocation(res).toLowerCase().includes('stock');
  }

  if (res.status !== 400) {
    return false;
  }

  try {
    const body = res.json();
    const message = String((body && body.message) || '').toLowerCase();
    return message.includes('stock');
  } catch (_error) {
    return String(res.body || '')
      .toLowerCase()
      .includes('stock');
  }
};
