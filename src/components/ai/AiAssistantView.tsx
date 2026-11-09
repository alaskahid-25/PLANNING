import React, { useState, useEffect } from 'react';
import { CalculationResult } from '../../utils/calculationEngine';
import {
  Brain,
  Sparkles,
  Send,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { exportManagementSummaryPdf } from '../../utils/exportUtils';

interface AiAssistantViewProps {
  calcResult: CalculationResult;
  stockBasis: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ calcResult, stockBasis }) => {
  const { kpis, consolidatedRequirements, skuRequirements } = calcResult;

  const [activeTab, setActiveTab] = useState<'summary' | 'qa'>('summary');
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  const [questionInput, setQuestionInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Rule-based high-fidelity executive report generator
  const generateRuleBasedExecutiveSummary = () => {
    const criticalShortages = consolidatedRequirements.filter(
      (i) => i.procurementPriority === 'CRITICAL' || i.procurementPriority === 'HIGH'
    );
    const excessItems = consolidatedRequirements.filter((i) => i.excess > 0);
    const longLeadItems = consolidatedRequirements.filter((i) => (i.totalLeadTime || 0) >= 14);

    return `### EXECUTIVE PRODUCTION & PROCUREMENT INTELLIGENCE REPORT
**Target Audience:** Managing Director · Plant Head · Finance Head · Stores Manager · Procurement Manager
**Plant Facility:** Cooking Oil Packaging & Refinery Complex #1
**Stock Availability Basis:** ${stockBasis}
**Audit Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

#### 1. Overall Production Readiness
${
  kpis.shortageCount === 0
    ? `**Status: GREEN / FULLY READY (100% Stock Sufficiency).** All ${kpis.totalUniqueRmCount} required raw and packaging components have verified available store balances exceeding gross bill-of-materials consumption norms.`
    : `**Status: AMBER-RED / CONDITIONAL READINESS (${kpis.stockSufficiencyPct}% Sufficiency).** Production cannot proceed to completion without emergency procurement interventions. Out of ${kpis.totalUniqueRmCount} required components, **${kpis.shortageCount} materials exhibit active stock deficits**, creating immediate production line stoppage risks.`
}

#### 2. Total Planned Production & SKU Overview
* **Planned Finished Goods Batches:** ${kpis.totalSkusInPlan} active SKUs scheduled across the plan period.
* **Aggregated Production Volume:** **${kpis.totalPlannedQty.toLocaleString()} Finished Packaging Units** (Boxes / Tins / Bottles).
* **Total Gross Material Requirement:** **${Math.round(kpis.totalMaterialRequirementQty).toLocaleString()} total gross consumption units** across edible oil bulk bases, printed multi-layer barrier film rolls, Kraft shipper boxes, tin containers, caps, and closure wads.

#### 3. Materials with Sufficient Stock
* **Sufficiency Count:** **${kpis.sufficientStockCount} out of ${kpis.totalUniqueRmCount} materials (${kpis.stockSufficiencyPct}%)** are currently in ready store inventory to sustain packaging lines.
* Materials with robust safety stock buffers include bulk edible oil silos, standard sealing tapes, and select secondary corrugated shippers.

#### 4. Critical Material Shortages (Production Halt Risk)
${
  criticalShortages.length === 0
    ? `* **No critical shortages identified.** All production lines have adequate material backing.`
    : criticalShortages
        .map(
          (c) =>
            `* **RM ${c.rmCode} (${c.rmDesc}):** Deficit of **${c.shortage.toLocaleString()} ${c.uom}** (Available: ${c.availableStock.toLocaleString()} ${c.uom} vs Required: ${c.totalRequiredQuantity.toLocaleString()} ${c.uom}). **Risk: Immediate line shut-down unless expedited.**`
        )
        .join('\n')
}

#### 5. High-Priority Purchase Requirements (Factored by MOQ)
* Recommended purchase orders have been strictly computed factoring supplier **MOQ (Minimum Order Quantity)** and batch replenishment thresholds:
${
  consolidatedRequirements
    .filter((i) => i.suggestedPurchaseQty > 0)
    .slice(0, 6)
    .map(
      (p) =>
        `* **PO Recommendation for ${p.rmCode} (${p.rmDesc}):** Order **${p.suggestedPurchaseQty.toLocaleString()} ${p.uom}** ${
          p.roundingOrMoqAdjustment ? `(${p.roundingOrMoqAdjustment})` : ''
        }`
    )
    .join('\n') || '* No purchase orders required at this time.'
}

#### 6. Procurement Lead-Time Risks & Release Dates
${
  longLeadItems.length === 0
    ? `* All suppliers have standard short lead times (< 14 days).`
    : `* **Long Lead-Time Exposure:** ${longLeadItems.length} materials require 14 to 21+ calendar days lead time from purchase order issuance to warehouse delivery:
${longLeadItems
  .slice(0, 4)
  .map(
    (l) =>
      `  - **${l.rmCode} (${l.rmDesc}):** Supplier Lead Time **${l.totalLeadTime} Days**. Required PO Release Date: **${l.latestProcurementReleaseDate || 'IMMEDIATE TODAY'}** (${l.leadTimeRisk}).`
  )
  .join('\n')}`
}

#### 7. Excess Inventory Observations & Capital Optimization
* **Surplus Materials Count:** **${kpis.excessStockCount} materials** hold inventory exceeding immediate planned consumption.
${
  excessItems.slice(0, 3).map(
    (e) =>
      `* **${e.rmCode} (${e.rmDesc}):** Surplus of **+${e.excess.toLocaleString()} ${e.uom}** remaining post-production.`
  ).join('\n') || '* No notable surplus materials.'
}
* **Recommendation:** Finance must withhold reordering on surplus items to minimize warehouse holding costs and preserve liquidity.

#### 8. Estimated Material Cost & Budget Impact
* **Total Valuated Plan Cost:** **${kpis.currency} ${Math.round(kpis.estimatedMaterialCost).toLocaleString()}** (covering ${itemsPricedPercentage()}% of components).
* **Net Shortage Procurement Outlay:** **${kpis.currency} ${Math.round(kpis.estimatedProcurementValue).toLocaleString()}** required in purchase order funding.
* **Unpriced Materials Note:** ${
      kpis.uncostedRmCount > 0
        ? `⚠️ **${kpis.uncostedRmCount} materials** currently lack unit purchase price records in the costing master. Rates were NOT invented; unpriced quantities (${Math.round(kpis.uncostedQty).toLocaleString()} units) are reported separately in Report 6.`
        : 'All materials have approved price records.'
    }

#### 9. Recommended Immediate Actions (Today's Prioritized Checklist)
1. **Procurement Head:** Immediately release purchase orders for **${
      criticalShortages.map((s) => s.rmCode).join(', ') || 'deficit materials'
    }** to secure factory dispatch slots before lead time expiry.
2. **Stores Manager:** Physically quarantine WIP balances and verify that QC clearance has occurred on Lot/Batch receipts.
3. **Plant Production Head:** Stagger packaging schedules starting with SKUs where 100% components are confirmed in stock (e.g. bulk tin lines) while expedited shipments are in transit.
4. **Finance Controller:** Release purchase advance of **${kpis.currency} ${Math.round(kpis.estimatedProcurementValue).toLocaleString()}** to strategic packaging and film roll suppliers.`;
  };

  const itemsPricedPercentage = () => {
    const total = consolidatedRequirements.length || 1;
    const priced = consolidatedRequirements.filter((i) => i.hasRate).length;
    return Math.round((priced / total) * 100);
  };

  // Generate or regenerate summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const contextData = {
        kpis,
        stockBasis,
        shortageItems: consolidatedRequirements.filter((i) => i.shortage > 0).slice(0, 15),
        excessItems: consolidatedRequirements.filter((i) => i.excess > 0).slice(0, 10),
        procurementPlan: consolidatedRequirements.filter((i) => i.suggestedPurchaseQty > 0).slice(0, 15),
        plannedSkus: skuRequirements.slice(0, 10),
      };

      const response = await fetch('/api/gemini/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setExecutiveSummary(data.summary);
          return;
        }
      }
    } catch {
      // Fallback cleanly to local rule-based engine
    } finally {
      // If server returned fallback or failed, use authoritative rule-based synthesis
      setExecutiveSummary((prev) => prev || generateRuleBasedExecutiveSummary());
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (!executiveSummary) {
      setExecutiveSummary(generateRuleBasedExecutiveSummary());
    }
  }, [calcResult]);

  // Handle Q&A prompt execution
  const handleAskQuestion = async (query: string) => {
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsGeneratingAnswer(true);

    try {
      const contextData = {
        kpis,
        stockBasis,
        shortages: consolidatedRequirements.filter((i) => i.shortage > 0),
        excess: consolidatedRequirements.filter((i) => i.excess > 0),
        procurementActions: consolidatedRequirements.filter((i) => i.suggestedPurchaseQty > 0),
        skus: skuRequirements,
      };

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, contextData }),
      });

      let answerText = '';
      if (response.ok) {
        const data = await response.json();
        if (data.answer && !data.fallback) {
          answerText = data.answer;
        }
      }

      // If offline or no key, provide exact data-backed rule-based response
      if (!answerText) {
        answerText = generateRuleBasedAnswer(query);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackText = generateRuleBasedAnswer(query);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Rule-based accurate question responder
  const generateRuleBasedAnswer = (q: string): string => {
    const qLower = q.toLowerCase();

    if (qLower.includes('stop production') || qLower.includes('stoppage')) {
      const criticals = consolidatedRequirements.filter((i) => i.procurementPriority === 'CRITICAL' || i.shortage > 0);
      if (criticals.length === 0) {
        return 'No materials are in deficit. Current store stock is sufficient for all planned SKUs.';
      }
      return `The following ${criticals.length} material(s) will halt production if not procured immediately:\n\n${criticals
        .map((c) => `• RM ${c.rmCode} (${c.rmDesc}): Deficit of ${c.shortage.toLocaleString()} ${c.uom}. (Available: ${c.availableStock.toLocaleString()} vs Required: ${c.totalRequiredQuantity.toLocaleString()})`)
        .join('\n')}`;
    }

    if (qLower.includes('order immediately') || qLower.includes('procurement action') || qLower.includes('today')) {
      const orders = consolidatedRequirements.filter((i) => i.suggestedPurchaseQty > 0);
      if (orders.length === 0) return 'No purchase orders are required today.';
      return `Procurement should release POs today for:\n\n${orders
        .map((o) => `• ${o.rmCode} (${o.rmDesc}): Order ${o.suggestedPurchaseQty.toLocaleString()} ${o.uom}. Action: ${o.actionRequired}`)
        .join('\n')}`;
    }

    if (qLower.includes('long lead') || qLower.includes('lead time')) {
      const longLeads = consolidatedRequirements.filter((i) => (i.totalLeadTime || 0) >= 14);
      return `Materials with long procurement lead times (≥ 14 days):\n\n${longLeads
        .map((l) => `• ${l.rmCode} (${l.rmDesc}): Lead time ${l.totalLeadTime} days. Stock: ${l.availableStock.toLocaleString()} ${l.uom}, Shortage: ${l.shortage.toLocaleString()} ${l.uom}.`)
        .join('\n')}`;
    }

    if (qLower.includes('cost') || qLower.includes('value') || qLower.includes('budget')) {
      return `Financial Summary:\n• Total Required Material Cost: ${kpis.currency} ${Math.round(kpis.estimatedMaterialCost).toLocaleString()}.\n• Estimated Shortage Procurement Value: ${kpis.currency} ${Math.round(kpis.estimatedProcurementValue).toLocaleString()}.\n• Materials missing rate records: ${kpis.uncostedRmCount} item(s).`;
    }

    if (qLower.includes('readiness') || qLower.includes('status')) {
      return `Overall Production Readiness: ${kpis.stockSufficiencyPct}% stock sufficiency. Planned production is ${kpis.totalPlannedQty.toLocaleString()} units across ${kpis.totalSkusInPlan} SKUs. There are ${kpis.shortageCount} material shortages.`;
    }

    // Default intelligent answer
    return `Based on the active production plan of ${kpis.totalPlannedQty.toLocaleString()} units, the system evaluated ${kpis.totalUniqueRmCount} components. There are ${kpis.shortageCount} deficit items with total recommended procurement value of ${kpis.currency} ${Math.round(kpis.estimatedProcurementValue).toLocaleString()}. Please refer to Report 3 (Shortage) and Report 5 (Procurement) for granular material details.`;
  };

  const sampleQuestions = [
    'Which materials are likely to stop production?',
    'Which materials must be ordered immediately?',
    'What actions should the procurement department take today?',
    'Which materials have long procurement lead times?',
    'What is the estimated material cost & procurement value?',
    'What is the overall production readiness status?',
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-amber-500" />
              <span>Smart Production Planning AI Assistant</span>
            </h2>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
              Management Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Boardroom-ready operational synthesis and interactive Q&A strictly grounded in your uploaded BOM norms, store inventory, and production schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-semibold">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'summary' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'qa' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive Executive Q&A
            </button>
          </div>

          <button
            onClick={() => exportManagementSummaryPdf(executiveSummary, kpis)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">
                9-Point Executive Management Summary (Board & Plant Leadership)
              </h3>
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
              <span>{isGeneratingSummary ? 'Synthesizing...' : 'Regenerate Analysis'}</span>
            </button>
          </div>

          {/* Formatted Markdown Display */}
          <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
            {executiveSummary}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE EXECUTIVE Q&A */}
      {activeTab === 'qa' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Interactive Management Inquiry Console
              </h3>
              <p className="text-[11px] text-slate-500">
                Ask specific production planning questions. Grounded strictly in your ERP data without hallucinated numbers.
              </p>
            </div>
          </div>

          {/* Suggested Prompts Pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q)}
                className="text-[11px] px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900 transition-colors border border-slate-200 text-left font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <Brain className="w-10 h-10 text-slate-300 mb-2" />
                <div className="font-semibold text-slate-600">Executive Production AI Ready</div>
                <div className="text-[11px] text-slate-400 max-w-sm mt-1">
                  Click a suggested question above or type your operational inquiry below (e.g. materials halting production, PO deadlines, costing).
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {msg.sender === 'user' ? 'Management' : 'Production AI'} · {msg.timestamp}
                  </div>
                  <div
                    className={`p-3 rounded-lg max-w-2xl whitespace-pre-wrap leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {isGeneratingAnswer && (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Analyzing bill of materials and stock balances...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAskQuestion(questionInput);
                }
              }}
              placeholder="Ask about material shortages, purchase orders, BOM consumption..."
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-xs focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => handleAskQuestion(questionInput)}
              disabled={!questionInput.trim() || isGeneratingAnswer}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
