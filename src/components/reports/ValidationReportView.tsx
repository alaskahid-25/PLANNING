import React, { useState, useMemo } from 'react';
import { DataValidationIssue } from '../../types';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Download, Search } from 'lucide-react';
import { exportValidationExcel } from '../../utils/exportUtils';

interface ValidationReportViewProps {
  issues: DataValidationIssue[];
}

export const ValidationReportView: React.FC<ValidationReportViewProps> = ({ issues }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [fileFilter, setFileFilter] = useState('ALL');

  const uniqueFiles = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.fileName)));
  }, [issues]);

  const filtered = useMemo(() => {
    return issues.filter((iss) => {
      const matchSearch =
        iss.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iss.columnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iss.suggestedCorrection.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSev = severityFilter === 'ALL' || iss.severity === severityFilter;
      const matchFile = fileFilter === 'ALL' || iss.fileName === fileFilter;

      return matchSearch && matchSev && matchFile;
    });
  }, [issues, searchTerm, severityFilter, fileFilter]);

  const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO').length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Report 7: Data Validation & Exception Audit</span>
            </h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                errorCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {issues.length === 0 ? 'Zero Integrity Errors' : `${issues.length} Audit Findings`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pinpoints unmapped records, missing SKUs, inconsistent UOMs, and duplicate material codes so planners can correct source Excel files before finalizing calculations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportValidationExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Validation Log</span>
          </button>
        </div>
      </div>

      {/* Severity Count Strip */}
      <div className="grid grid-cols-3 gap-4 text-xs font-medium">
        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-900 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Blocking Errors</span>
          </div>
          <span className="font-mono text-base font-bold text-rose-700">{errorCount}</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Discrepancy Warnings</span>
          </div>
          <span className="font-mono text-base font-bold text-amber-700">{warningCount}</span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Informational Notices</span>
          </div>
          <span className="font-mono text-base font-bold text-blue-700">{infoCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Issue or Correction description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">All Severities</option>
              <option value="ERROR">Errors Only</option>
              <option value="WARNING">Warnings Only</option>
              <option value="INFO">Info Notices Only</option>
            </select>
          </div>

          {uniqueFiles.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">File:</span>
              <select
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
              >
                <option value="ALL">All Source Files</option>
                {uniqueFiles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3 text-center w-20">Severity</th>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Sheet</th>
                <th className="py-2.5 px-2 text-center w-14">Row</th>
                <th className="py-2.5 px-3">Column</th>
                <th className="py-2.5 px-3 min-w-[280px]">Issue Description</th>
                <th className="py-2.5 px-3 min-w-[260px]">Suggested Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    No data validation issues found! All records and codes cleanly reconciled.
                  </td>
                </tr>
              ) : (
                filtered.map((iss) => (
                  <tr
                    key={iss.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      iss.severity === 'ERROR'
                        ? 'bg-rose-50/20'
                        : iss.severity === 'WARNING'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          iss.severity === 'ERROR'
                            ? 'bg-rose-600 text-white'
                            : iss.severity === 'WARNING'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {iss.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {iss.fileName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {iss.sheetName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-500">
                      {iss.rowNumber > 0 ? iss.rowNumber : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">
                      {iss.columnName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {iss.issueDescription}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {iss.suggestedCorrection}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
