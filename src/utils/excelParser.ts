import * as XLSX from 'xlsx';
import { BOMItem, StoreStockItem, ProductionPlanItem, MaterialPriceItem, DataValidationIssue } from '../types';

export interface ParsedWorkbook {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
}

// Clean string helper that strictly preserves leading zeros, dots, and formats
export function cleanCode(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str;
}

export function cleanNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const cleanStr = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

export async function readExcelFile(file: File): Promise<{
  fileName: string;
  sheetNames: string[];
  workbook: XLSX.WorkBook;
}> {
  const arrayBuffer = await file.arrayBuffer();
  // read with cellDates: true, raw: false to keep text formatting
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  return {
    fileName: file.name,
    sheetNames: workbook.SheetNames,
    workbook,
  };
}

export function getSheetData(workbook: XLSX.WorkBook, sheetName: string): {
  headers: string[];
  rows: Record<string, any>[];
} {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return { headers: [], rows: [] };

  // Convert to array of arrays first to inspect header row
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (!rawData || rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find header row (first row with non-empty cells)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some((c: any) => cleanCode(c) !== '')) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders: string[] = (rawData[headerRowIndex] || []).map((h: any) => cleanCode(h));
  // Filter out completely empty trailing headers while maintaining index mapping
  const headers = rawHeaders.map((h, i) => (h ? h : `Column_${i + 1}`));

  const rows: Record<string, any>[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const rowValues = rawData[i];
    if (!rowValues || rowValues.every((c: any) => cleanCode(c) === '')) {
      continue; // Skip completely blank row
    }
    const rowObj: Record<string, any> = { _rowIndex: i + 1 };
    headers.forEach((header, colIdx) => {
      rowObj[header] = rowValues[colIdx] !== undefined ? cleanCode(rowValues[colIdx]) : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

// ----------------------------------------------------
// BOM MASTER PARSER
// ----------------------------------------------------
const BOM_SYNONYMS: Record<string, string[]> = {
  sku: ['sku', 'sku code', 'finished good', 'fg code', 'finished goods sku code', 'item'],
  skuName: ['sku name', 'sku description', 'finished goods description', 'item name', 'description', 'fg description', 'fg name'],
  rm: ['rm', 'rm code', 'raw material', 'raw material code', 'component', 'component code', 'material code', 'pm code'],
  rmDesc: ['rm dec', 'rm desc', 'rm description', 'raw material description', 'material description', 'component description', 'pm desc'],
  uom: ['uom', 'unit', 'unit of measurement', 'uom.', 'measure'],
  norms: ['norms', 'norm', 'consumption norm', 'bom norm', 'qty per unit', 'quantity', 'consumption'],
};

export function autoDetectBOMColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    sku: '',
    skuName: '',
    rm: '',
    rmDesc: '',
    uom: '',
    norms: '',
  };

  const lowerHeaders = headers.map(h => ({ original: h, lower: h.toLowerCase().trim() }));

  for (const [key, synonyms] of Object.entries(BOM_SYNONYMS)) {
    // Exact match first
    const exact = lowerHeaders.find(h => synonyms.includes(h.lower));
    if (exact) {
      mapping[key] = exact.original;
      continue;
    }
    // Partial substring match
    const partial = lowerHeaders.find(h => synonyms.some(syn => h.lower.includes(syn)));
    if (partial) {
      mapping[key] = partial.original;
    }
  }

  return mapping;
}

export function parseBOMRows(
  rows: Record<string, any>[],
  columnMapping: Record<string, string>,
  fileName: string,
  sheetName: string
): { items: BOMItem[]; issues: DataValidationIssue[] } {
  const items: BOMItem[] = [];
  const issues: DataValidationIssue[] = [];

  rows.forEach((row, idx) => {
    const rowNum = row._rowIndex || idx + 2;
    const sku = cleanCode(row[columnMapping.sku]);
    const skuName = cleanCode(row[columnMapping.skuName]);
    const rm = cleanCode(row[columnMapping.rm]);
    const rmDesc = cleanCode(row[columnMapping.rmDesc]);
    const uom = cleanCode(row[columnMapping.uom]).toUpperCase();
    const rawNorms = row[columnMapping.norms];

    if (!sku && !rm) {
      return; // blank row
    }

    if (!sku) {
      issues.push({
        id: `bom-${rowNum}-sku`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.sku || 'SKU',
        issueDescription: 'Missing SKU code for BOM component',
        suggestedCorrection: 'Provide valid Finished Goods SKU code',
        severity: 'ERROR',
      });
      return;
    }

    if (!rm) {
      issues.push({
        id: `bom-${rowNum}-rm`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.rm || 'RM',
        issueDescription: `Missing Raw Material (RM) code for SKU ${sku}`,
        suggestedCorrection: 'Provide valid RM / PM material code',
        severity: 'ERROR',
      });
      return;
    }

    if (!uom) {
      issues.push({
        id: `bom-${rowNum}-uom`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.uom || 'UOM',
        issueDescription: `BOM material ${rm} has missing UOM`,
        suggestedCorrection: 'Specify standard unit of measurement (e.g., KGS, NOS, LITRES)',
        severity: 'WARNING',
      });
    }

    const norms = cleanNumber(rawNorms);
    if (rawNorms === '' || rawNorms === undefined || isNaN(parseFloat(rawNorms))) {
      issues.push({
        id: `bom-${rowNum}-norms`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.norms || 'Norms',
        issueDescription: `Invalid or missing norm value for SKU ${sku} - RM ${rm}`,
        suggestedCorrection: 'Verify and input numeric consumption norm',
        severity: 'WARNING',
      });
    }

    items.push({
      sku,
      skuName: skuName || sku,
      rm,
      rmDesc: rmDesc || rm,
      uom: uom || 'NOS',
      norms,
      sheetName,
      rowNumber: rowNum,
    });
  });

  return { items, issues };
}

// ----------------------------------------------------
// STORE STOCK PARSER
// ----------------------------------------------------
const STOCK_SYNONYMS: Record<string, string[]> = {
  itemcode: ['itemcode', 'item code', 'material code', 'rm code', 'rm', 'code', 'material'],
  description: ['description', 'item description', 'material description', 'rm dec', 'rm desc', 'name'],
  uom: ['uom', 'unit', 'unit of measurement'],
  readyStockForProduction: ['ready stock for production', 'ready stock', 'usable stock', 'production ready stock'],
  opening: ['opening', 'opening stock', 'op stock', 'op. stock'],
  receipts: ['receipts', 'receipt', 'goods received', 'grn'],
  gpPending: ['gp pending', 'gate pass pending', 'pending gp'],
  holdRejectQc: ['hold/reject items confirmed by qc', 'hold reject qc', 'qc hold', 'qc rejected', 'hold/reject'],
  others: ['others', 'other movements'],
  qcIssues: ['qc issues', 'qc issue'],
  loadingIssue: ['loading issue', 'loading issues', 'dispatch issue'],
  packingIssues: ['packing issues', 'packing issue'],
  totalClosing: ['total closing', 'closing stock', 'closing', 'cl stock'],
  wip: ['wip', 'work in progress', 'wip stock'],
  totalQuantityWipClosing: ['total quantity(wip& closing)', 'total quantity (wip & closing)', 'total stock', 'wip & closing'],
  minStock: ['min.stock', 'min stock', 'minimum stock'],
  maxStock: ['max stock', 'maximum stock'],
  reorderQty: ['re-order qty', 'reorder qty', 'reorder quantity'],
  moq: ['moq', 'minimum order quantity'],
  reorderLevel: ['re-order level', 'reorder level', 'rol'],
  neededQty: ['needed qty', 'needed quantity', 'requirement qty'],
  leadtime: ['leadtime (after open po process)', 'leadtime', 'lead time', 'po lead time'],
  totalLeadTime: ['total lead time (days)', 'total lead time', 'lead time (days)', 'lead time days'],
  lastIssueDate: ['last issue date', 'issue date'],
  lotNumbers: ['lot numbers', 'lot no', 'batch no', 'lot number'],
  remarks: ['remarks', 'notes', 'comments'],
};

export function autoDetectStockColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map(h => ({ original: h, lower: h.toLowerCase().trim() }));

  for (const [key, synonyms] of Object.entries(STOCK_SYNONYMS)) {
    // 1. Exact match
    const exact = lowerHeaders.find(h => synonyms.includes(h.lower));
    if (exact) {
      mapping[key] = exact.original;
      continue;
    }
    // 2. Contains match
    const partial = lowerHeaders.find(h => synonyms.some(syn => h.lower.includes(syn)));
    if (partial) {
      mapping[key] = partial.original;
    }
  }

  return mapping;
}

export function parseStockRows(
  rows: Record<string, any>[],
  columnMapping: Record<string, string>,
  fileName: string,
  sheetName: string
): { items: StoreStockItem[]; issues: DataValidationIssue[] } {
  const items: StoreStockItem[] = [];
  const issues: DataValidationIssue[] = [];
  const seenCodes = new Map<string, number>();

  rows.forEach((row, idx) => {
    const rowNum = row._rowIndex || idx + 2;
    const itemcode = cleanCode(row[columnMapping.itemcode]);
    const description = cleanCode(row[columnMapping.description]);
    const uom = cleanCode(row[columnMapping.uom]).toUpperCase();

    if (!itemcode) {
      // ignore rows without item code
      return;
    }

    if (seenCodes.has(itemcode)) {
      const prevRow = seenCodes.get(itemcode);
      issues.push({
        id: `stock-${rowNum}-duplicate`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.itemcode || 'Itemcode',
        issueDescription: `Duplicate material code "${itemcode}" found (also on row ${prevRow}). Separate lots or storage locations must be audited to avoid double counting.`,
        suggestedCorrection: 'Verify if multiple rows represent different lots or consolidation is needed.',
        severity: 'WARNING',
      });
    } else {
      seenCodes.set(itemcode, rowNum);
    }

    const readyStock = cleanNumber(row[columnMapping.readyStockForProduction]);
    const totalClosing = cleanNumber(row[columnMapping.totalClosing]);
    const wip = cleanNumber(row[columnMapping.wip]);

    // Validation warning if ready stock is completely empty/blank when other stocks exist
    if (row[columnMapping.readyStockForProduction] === '' && (totalClosing > 0 || wip > 0)) {
      issues.push({
        id: `stock-${rowNum}-blank-ready`,
        fileName,
        sheetName,
        rowNumber: rowNum,
        columnName: columnMapping.readyStockForProduction || 'Ready Stock For Production',
        issueDescription: `Material ${itemcode} has blank "Ready Stock For Production" while closing/WIP stock is present.`,
        suggestedCorrection: 'Confirm available production stock quantity in Store ERP.',
        severity: 'INFO',
      });
    }

    const item: StoreStockItem = {
      sNo: cleanCode(row['S.NO'] || row['sno'] || idx + 1),
      itemcode,
      description: description || itemcode,
      uom: uom || 'NOS',
      opening: cleanNumber(row[columnMapping.opening]),
      receipts: cleanNumber(row[columnMapping.receipts]),
      gpPending: cleanNumber(row[columnMapping.gpPending]),
      holdRejectQc: cleanNumber(row[columnMapping.holdRejectQc]),
      others: cleanNumber(row[columnMapping.others]),
      qcIssues: cleanNumber(row[columnMapping.qcIssues]),
      loadingIssue: cleanNumber(row[columnMapping.loadingIssue]),
      packingIssues: cleanNumber(row[columnMapping.packingIssues]),
      readyStockForProduction: readyStock,
      totalClosing: totalClosing || readyStock,
      wip,
      totalQuantityWipClosing: cleanNumber(row[columnMapping.totalQuantityWipClosing]) || (totalClosing + wip),
      remarks: cleanCode(row[columnMapping.remarks]),
      minStock: cleanNumber(row[columnMapping.minStock]),
      maxStock: cleanNumber(row[columnMapping.maxStock]),
      reorderQty: cleanNumber(row[columnMapping.reorderQty]),
      moq: cleanNumber(row[columnMapping.moq]),
      reorderLevel: cleanNumber(row[columnMapping.reorderLevel]),
      neededQty: cleanNumber(row[columnMapping.neededQty]),
      leadtime: cleanNumber(row[columnMapping.leadtime]),
      totalLeadTime: cleanNumber(row[columnMapping.totalLeadTime]) || cleanNumber(row[columnMapping.leadtime]) || 7,
      lotNumbers: cleanCode(row[columnMapping.lotNumbers]),
      lastIssueDate: cleanCode(row[columnMapping.lastIssueDate]),
      rowNumber: rowNum,
    };

    items.push(item);
  });

  return { items, issues };
}

// ----------------------------------------------------
// PRODUCTION PLAN PARSER (Supports both Row & Multi-Day Matrix formats)
// ----------------------------------------------------
export function isDateHeader(headerStr: string): boolean {
  if (!headerStr) return false;
  const str = headerStr.trim();
  // Matches DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY
  if (/^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$/.test(str)) return true;
  if (/^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/.test(str)) return true;
  // Check if string contains month names like "09-Nov" or "Nov 09"
  if (/(\d{1,2}[-/ ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/ ]\d{1,2})/i.test(str)) {
    return true;
  }
  return false;
}

export function normalizeDateString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const str = dateStr.trim();
  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    if (parseInt(month) > 12 && parseInt(day) <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}

const PLAN_SYNONYMS: Record<string, string[]> = {
  date: ['date', 'plan date', 'production date', 'schedule date', 'target date', 'period'],
  sku: ['sku', 'sku code', 'finished good', 'fg code', 'item code', 'product code'],
  skuName: ['sku name', 'sku description', 'product name', 'description', 'finished good name'],
  plannedQuantity: ['planned quantity', 'planned qty', 'quantity', 'qty', 'plan qty', 'production qty', 'target qty'],
  productionUnit: ['production unit', 'unit', 'uom', 'type', 'pack type'],
};

export function autoDetectPlanColumns(headers: string[]): {
  mapping: Record<string, string>;
  isMatrixFormat: boolean;
  dateColumns: string[];
} {
  const dateColumns = headers.filter((h) => isDateHeader(h));
  const isMatrixFormat = dateColumns.length >= 1;

  const mapping: Record<string, string> = {
    date: '',
    sku: '',
    skuName: '',
    plannedQuantity: '',
    productionUnit: '',
  };

  const lowerHeaders = headers.map(h => ({ original: h, lower: h.toLowerCase().trim() }));

  if (isMatrixFormat) {
    // In multi-day matrix format (as in the screenshot):
    // First non-date column is SKU, second is Description
    const nonDateCols = headers.filter((h) => !isDateHeader(h));
    const skuCol = nonDateCols.find((c) =>
      PLAN_SYNONYMS.sku.some((s) => c.toLowerCase().includes(s))
    ) || nonDateCols[0] || headers[0];

    const descCol = nonDateCols.find((c) =>
      c !== skuCol && PLAN_SYNONYMS.skuName.some((s) => c.toLowerCase().includes(s))
    ) || nonDateCols.find(c => c !== skuCol) || headers[1] || '';

    mapping.sku = skuCol;
    mapping.skuName = descCol;
    mapping.date = dateColumns[0];
    mapping.plannedQuantity = dateColumns[0];
  } else {
    for (const [key, synonyms] of Object.entries(PLAN_SYNONYMS)) {
      const exact = lowerHeaders.find(h => synonyms.includes(h.lower));
      if (exact) {
        mapping[key] = exact.original;
        continue;
      }
      const partial = lowerHeaders.find(h => synonyms.some(syn => h.lower.includes(syn)));
      if (partial) {
        mapping[key] = partial.original;
      }
    }
  }

  return { mapping, isMatrixFormat, dateColumns };
}

export function parsePlanRows(
  rows: Record<string, any>[],
  columnMapping: Record<string, string>,
  fileName: string,
  sheetName: string,
  defaultUnit: string = 'BOXES',
  matrixDateColumns: string[] = []
): { items: ProductionPlanItem[]; issues: DataValidationIssue[]; isMatrix: boolean } {
  const items: ProductionPlanItem[] = [];
  const issues: DataValidationIssue[] = [];

  // Determine if this is a Multi-Date Matrix format (either passed in or detected in mapping)
  const isMatrix = matrixDateColumns.length > 0;

  if (isMatrix) {
    // Unpivot multi-day schedule matrix into production batches
    rows.forEach((row, idx) => {
      const rowNum = row._rowIndex || idx + 2;
      const sku = cleanCode(row[columnMapping.sku]);
      const skuName = cleanCode(row[columnMapping.skuName]);

      if (!sku) return; // Skip blank line

      matrixDateColumns.forEach((dateCol) => {
        const rawQty = row[dateCol];
        const qty = cleanNumber(rawQty);
        if (qty > 0) {
          const normalizedDate = normalizeDateString(dateCol);
          items.push({
            id: `plan-matrix-${sku}-${normalizedDate}-${idx}`,
            date: normalizedDate,
            sku,
            skuName: skuName || sku,
            plannedQuantity: qty,
            productionUnit: defaultUnit,
            rowNumber: rowNum,
          });
        }
      });
    });
  } else {
    // Standard row-by-row format
    rows.forEach((row, idx) => {
      const rowNum = row._rowIndex || idx + 2;
      const sku = cleanCode(row[columnMapping.sku]);
      const skuName = cleanCode(row[columnMapping.skuName]);
      const rawDate = cleanCode(row[columnMapping.date]);
      const date = rawDate ? normalizeDateString(rawDate) : new Date().toISOString().split('T')[0];
      const rawQty = row[columnMapping.plannedQuantity];
      const unit = cleanCode(row[columnMapping.productionUnit]) || defaultUnit;

      if (!sku) {
        return; // Skip empty row
      }

      const plannedQuantity = cleanNumber(rawQty);
      if (plannedQuantity <= 0) {
        issues.push({
          id: `plan-${rowNum}-qty`,
          fileName,
          sheetName,
          rowNumber: rowNum,
          columnName: columnMapping.plannedQuantity || 'Planned Quantity',
          issueDescription: `Planned quantity for SKU ${sku} is zero or negative (${rawQty})`,
          suggestedCorrection: 'Enter a positive planned production quantity',
          severity: 'WARNING',
        });
      }

      items.push({
        id: `plan-item-${idx + 1}-${sku}`,
        date,
        sku,
        skuName: skuName || sku,
        plannedQuantity,
        productionUnit: unit,
        rowNumber: rowNum,
      });
    });
  }

  return { items, issues, isMatrix };
}

// ----------------------------------------------------
// MATERIAL PRICE LIST PARSER
// ----------------------------------------------------
const PRICE_SYNONYMS: Record<string, string[]> = {
  rmCode: ['rm code', 'rm', 'material code', 'itemcode', 'item code', 'code'],
  materialDescription: ['material description', 'description', 'rm dec', 'rm desc', 'item description'],
  uom: ['uom', 'unit'],
  ratePerUom: ['rate per uom', 'rate', 'price', 'unit rate', 'cost per unit', 'cost'],
  currency: ['currency', 'curr'],
};

export function autoDetectPriceColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    rmCode: '',
    materialDescription: '',
    uom: '',
    ratePerUom: '',
    currency: '',
  };
  const lowerHeaders = headers.map(h => ({ original: h, lower: h.toLowerCase().trim() }));

  for (const [key, synonyms] of Object.entries(PRICE_SYNONYMS)) {
    const exact = lowerHeaders.find(h => synonyms.includes(h.lower));
    if (exact) {
      mapping[key] = exact.original;
      continue;
    }
    const partial = lowerHeaders.find(h => synonyms.some(syn => h.lower.includes(syn)));
    if (partial) {
      mapping[key] = partial.original;
    }
  }

  return mapping;
}

export function parsePriceRows(
  rows: Record<string, any>[],
  columnMapping: Record<string, string>,
  defaultCurrency: string = 'INR'
): MaterialPriceItem[] {
  const items: MaterialPriceItem[] = [];

  rows.forEach((row) => {
    const rmCode = cleanCode(row[columnMapping.rmCode]);
    const desc = cleanCode(row[columnMapping.materialDescription]);
    const uom = cleanCode(row[columnMapping.uom]).toUpperCase();
    const rate = cleanNumber(row[columnMapping.ratePerUom]);
    const curr = cleanCode(row[columnMapping.currency]) || defaultCurrency;

    if (rmCode && rate > 0) {
      items.push({
        rmCode,
        materialDescription: desc || rmCode,
        uom: uom || 'NOS',
        ratePerUom: rate,
        currency: curr,
      });
    }
  });

  return items;
}
