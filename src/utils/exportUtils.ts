import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ConsolidatedMaterialRequirement,
  SkuMaterialRequirement,
  DataValidationIssue,
  ProductionPlanItem,
} from '../types';

export function exportConsolidatedExcel(
  items: ConsolidatedMaterialRequirement[],
  fileName: string = 'Consolidated_Material_Requirements.xlsx'
): void {
  const data = items.map((item) => ({
    'S.No': item.sNo,
    'RM Code': item.rmCode,
    'RM Description': item.rmDesc,
    'UOM': item.uom,
    'Total Required Quantity': item.totalRequiredQuantity,
    'Available Stock': item.availableStock,
    'Stock Basis Used': item.stockBasisUsed,
    'WIP': item.wip,
    'Total Closing': item.totalClosing,
    'Shortage': item.shortage,
    'Excess': item.excess,
    'Stock Status': item.stockStatus,
    'Procurement Priority': item.procurementPriority,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 38 },
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Material Req');
  XLSX.writeFile(wb, fileName);
}

export function exportSkuWiseExcel(
  items: SkuMaterialRequirement[],
  fileName: string = 'SKU_Wise_Material_Requirements.xlsx'
): void {
  const data = items.map((item) => ({
    'SKU': item.sku,
    'SKU Name': item.skuName,
    'Planned Quantity': item.plannedQuantity,
    'Production Unit': item.productionUnit,
    'RM Code': item.rmCode,
    'RM Description': item.rmDesc,
    'UOM': item.uom,
    'Norms': item.norms,
    'Required Quantity': item.requiredQuantity,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 38 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 10 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'SKU Wise Requirements');
  XLSX.writeFile(wb, fileName);
}

export function exportShortageExcel(
  items: ConsolidatedMaterialRequirement[],
  fileName: string = 'Material_Shortage_Report.xlsx'
): void {
  const shortages = items.filter((i) => i.shortage > 0);
  const data = shortages.map((item) => {
    const pct = item.totalRequiredQuantity > 0 ? (item.shortage / item.totalRequiredQuantity) * 100 : 0;
    return {
      'RM Code': item.rmCode,
      'RM Description': item.rmDesc,
      'UOM': item.uom,
      'Required Quantity': item.totalRequiredQuantity,
      'Available Stock': item.availableStock,
      'Shortage': item.shortage,
      'Shortage %': `${pct.toFixed(1)}%`,
      'Required Production Date': item.earliestRequiredDate || 'Immediate',
      'Total Lead Time (Days)': item.totalLeadTime || 7,
      'Procurement Priority': item.procurementPriority,
      'Suggested Purchase Qty': item.suggestedPurchaseQty,
      'PO Release Deadline': item.latestProcurementReleaseDate || 'Immediate',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Shortage Report');
  XLSX.writeFile(wb, fileName);
}

export function exportExcessExcel(
  items: ConsolidatedMaterialRequirement[],
  fileName: string = 'Excess_Stock_Report.xlsx'
): void {
  const excessItems = items.filter((i) => i.excess > 0);
  const data = excessItems.map((item) => ({
    'RM Code': item.rmCode,
    'RM Description': item.rmDesc,
    'UOM': item.uom,
    'Available Stock': item.availableStock,
    'Required Quantity': item.totalRequiredQuantity,
    'Excess Quantity': item.excess,
    'Maximum Stock': item.maxStock || 'N/A',
    'Excess Above Max Stock': item.maxStock && item.availableStock > item.maxStock ? item.availableStock - item.maxStock : 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Excess Stock');
  XLSX.writeFile(wb, fileName);
}

export function exportProcurementPlanExcel(
  items: ConsolidatedMaterialRequirement[],
  fileName: string = 'Procurement_Action_Plan.xlsx'
): void {
  const data = items.map((item) => ({
    'RM Code': item.rmCode,
    'RM Description': item.rmDesc,
    'UOM': item.uom,
    'Shortage': item.shortage,
    'Re-order Level': item.reorderLevel || 'N/A',
    'MOQ': item.moq || 'N/A',
    'Re-order Qty': item.reorderQty || 'N/A',
    'Needed Qty': item.neededQty || 'N/A',
    'Total Lead Time (Days)': item.totalLeadTime || 7,
    'Suggested Purchase Qty': item.suggestedPurchaseQty,
    'Latest PO Release Date': item.latestProcurementReleaseDate || 'Immediate',
    'Priority': item.procurementPriority,
    'Action Required': item.actionRequired,
    'MOQ / Batch Note': item.roundingOrMoqAdjustment || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 45 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Procurement Plan');
  XLSX.writeFile(wb, fileName);
}

export function exportCostingExcel(
  items: ConsolidatedMaterialRequirement[],
  fileName: string = 'Material_Cost_Report.xlsx'
): void {
  const data = items.map((item) => ({
    'RM Code': item.rmCode,
    'RM Description': item.rmDesc,
    'UOM': item.uom,
    'Required Quantity': item.totalRequiredQuantity,
    'Rate per UOM': item.hasRate ? item.rate : 'RATE NOT AVAILABLE',
    'Currency': item.currency || 'INR',
    'Total Cost': item.hasRate && item.totalCost ? item.totalCost : 'EXCLUDED (NO RATE)',
    'Missing Rate Status': item.hasRate ? 'Priced' : 'RATE NOT AVAILABLE',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Material Costing');
  XLSX.writeFile(wb, fileName);
}

export function exportValidationExcel(
  issues: DataValidationIssue[],
  fileName: string = 'Data_Validation_Report.xlsx'
): void {
  const data = issues.map((iss) => ({
    'Severity': iss.severity,
    'File Name': iss.fileName,
    'Excel Sheet': iss.sheetName,
    'Row Number': iss.rowNumber,
    'Column Name': iss.columnName,
    'Issue Description': iss.issueDescription,
    'Suggested Correction': iss.suggestedCorrection,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 45 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Validation Issues');
  XLSX.writeFile(wb, fileName);
}

export function exportCompleteProductionWorkbook(
  consolidated: ConsolidatedMaterialRequirement[],
  skuRequirements: SkuMaterialRequirement[],
  plan: ProductionPlanItem[],
  issues: DataValidationIssue[],
  fileName: string = 'Complete_Production_Planning_Workbook.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Plan
  const planData = plan.map((p) => ({
    'Target Date': p.date,
    'SKU Code': p.sku,
    'SKU Description': p.skuName,
    'Planned Quantity': p.plannedQuantity,
    'Unit': p.productionUnit,
  }));
  const wsPlan = XLSX.utils.json_to_sheet(planData);
  XLSX.utils.book_append_sheet(wb, wsPlan, '1. Production Plan');

  // Sheet 2: Consolidated RM
  const consData = consolidated.map((i) => ({
    'S.No': i.sNo,
    'RM Code': i.rmCode,
    'RM Description': i.rmDesc,
    'UOM': i.uom,
    'Total Required': i.totalRequiredQuantity,
    'Available Stock': i.availableStock,
    'Stock Basis': i.stockBasisUsed,
    'Shortage': i.shortage,
    'Excess': i.excess,
    'Status': i.stockStatus,
    'Priority': i.procurementPriority,
  }));
  const wsCons = XLSX.utils.json_to_sheet(consData);
  XLSX.utils.book_append_sheet(wb, wsCons, '2. Consolidated RM');

  // Sheet 3: SKU-wise BOM Requirements
  const skuData = skuRequirements.map((s) => ({
    'SKU': s.sku,
    'SKU Name': s.skuName,
    'Plan Qty': s.plannedQuantity,
    'Unit': s.productionUnit,
    'RM Code': s.rmCode,
    'RM Description': s.rmDesc,
    'UOM': s.uom,
    'Norms': s.norms,
    'Required RM Qty': s.requiredQuantity,
  }));
  const wsSku = XLSX.utils.json_to_sheet(skuData);
  XLSX.utils.book_append_sheet(wb, wsSku, '3. SKU-wise BOM Requirements');

  // Sheet 4: Procurement Actions
  const procData = consolidated
    .filter((i) => i.suggestedPurchaseQty > 0 || i.shortage > 0)
    .map((i) => ({
      'RM Code': i.rmCode,
      'RM Description': i.rmDesc,
      'UOM': i.uom,
      'Shortage': i.shortage,
      'Suggested Order Qty': i.suggestedPurchaseQty,
      'Lead Time (Days)': i.totalLeadTime,
      'PO Deadline': i.latestProcurementReleaseDate || 'Immediate',
      'Priority': i.procurementPriority,
      'Action': i.actionRequired,
    }));
  const wsProc = XLSX.utils.json_to_sheet(procData);
  XLSX.utils.book_append_sheet(wb, wsProc, '4. Procurement Action Plan');

  // Sheet 5: Data Validation
  const valData = issues.map((iss) => ({
    'Severity': iss.severity,
    'File': iss.fileName,
    'Sheet': iss.sheetName,
    'Row': iss.rowNumber,
    'Column': iss.columnName,
    'Description': iss.issueDescription,
    'Suggested Correction': iss.suggestedCorrection,
  }));
  const wsVal = XLSX.utils.json_to_sheet(valData);
  XLSX.utils.book_append_sheet(wb, wsVal, '5. Data Exceptions');

  XLSX.writeFile(wb, fileName);
}

// ----------------------------------------------------
// PDF EXPORTS
// ----------------------------------------------------

export function exportManagementSummaryPdf(
  summaryText: string,
  kpis: any,
  fileName: string = 'Executive_Management_Summary.pdf'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header banner
  doc.setFillColor(15, 23, 42); // Navy 900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART PRODUCTION PLANNER AI', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Cooking Oil Manufacturing · Executive Production & Procurement Intelligence Report', 14, 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);

  // KPI Overview Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Executive Metrics', 14, 36);

  const kpiData = [
    ['Total Planned SKUs', `${kpis.totalSkusInPlan}`, 'Total Material Requirement', `${kpis.totalMaterialRequirementQty.toLocaleString()}`],
    ['Planned Production Qty', `${kpis.totalPlannedQty.toLocaleString()}`, 'Materials with Shortage', `${kpis.shortageCount}`],
    ['Unique Raw Materials', `${kpis.totalUniqueRmCount}`, 'Critical Purchase Items', `${kpis.criticalProcurementCount}`],
    ['Stock Sufficiency Rate', `${kpis.stockSufficiencyPct}%`, 'Estimated Material Cost', `${kpis.currency} ${kpis.estimatedMaterialCost.toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Value', 'Metric', 'Value']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 40 },
      2: { fontStyle: 'bold', cellWidth: 50 },
      3: { cellWidth: 40 },
    },
  });

  // Summary Text
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 70;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Management Narrative', 14, finalY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(summaryText, 182);
  doc.text(splitText, 14, finalY + 6);

  doc.save(fileName);
}

export function exportCompleteProductionPlanningPdf(
  consolidated: ConsolidatedMaterialRequirement[],
  kpis: any,
  issues: DataValidationIssue[],
  fileName: string = 'Complete_Production_Planning_Report.pdf'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Top header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART PRODUCTION PLANNER AI — COMPREHENSIVE AUDIT REPORT', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cooking Oil Manufacturing · Generated on ${new Date().toLocaleString()} · Stock Basis: ${kpis.stockBasisUsed || 'Ready Stock For Production'}`, 14, 18);

  // Executive summary strip
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Summary: ${kpis.totalSkusInPlan} SKUs Planned | Planned Qty: ${kpis.totalPlannedQty.toLocaleString()} | Materials: ${kpis.totalUniqueRmCount} | Shortage Items: ${kpis.shortageCount} | Stock Sufficiency: ${kpis.stockSufficiencyPct}% | Est Cost: ${kpis.currency} ${kpis.estimatedMaterialCost.toLocaleString()}`,
    14,
    30
  );

  // Detailed Consolidated Table
  const tableRows = consolidated.map((item) => [
    item.sNo,
    item.rmCode,
    item.rmDesc.length > 30 ? item.rmDesc.substring(0, 30) + '...' : item.rmDesc,
    item.uom,
    item.totalRequiredQuantity.toLocaleString(),
    item.availableStock.toLocaleString(),
    item.shortage > 0 ? item.shortage.toLocaleString() : '-',
    item.excess > 0 ? item.excess.toLocaleString() : '-',
    item.stockStatus,
    item.procurementPriority,
    item.suggestedPurchaseQty > 0 ? item.suggestedPurchaseQty.toLocaleString() : '-',
    item.latestProcurementReleaseDate || 'Immediate',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [[
      'S.No',
      'RM Code',
      'Description',
      'UOM',
      'Required',
      'Avail Stock',
      'Shortage',
      'Excess',
      'Status',
      'Priority',
      'Suggested PO',
      'PO Release Date',
    ]],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 12 },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 22, halign: 'center' },
      9: { cellWidth: 22, halign: 'center' },
      10: { cellWidth: 24, halign: 'right' },
      11: { cellWidth: 24, halign: 'center' },
    },
  });

  // If there are validation issues, add a page for Data Exceptions
  if (issues && issues.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Validation & Integrity Exceptions', 14, 16);

    const issueRows = issues.map((iss) => [
      iss.severity,
      iss.fileName,
      iss.sheetName,
      iss.rowNumber,
      iss.columnName,
      iss.issueDescription,
      iss.suggestedCorrection,
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['Severity', 'File', 'Sheet', 'Row', 'Column', 'Issue Description', 'Suggested Correction']],
      body: issueRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });
  }

  doc.save(fileName);
}
