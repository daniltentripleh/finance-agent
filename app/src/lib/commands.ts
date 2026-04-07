export interface Command {
  name: string;
  description: string;
  category: string;
  hint?: string;
}

export const COMMANDS: Command[] = [
  // Financial Analysis
  { name: "/dcf", description: "Build a DCF valuation model", category: "Financial Analysis", hint: "AAPL" },
  { name: "/comps", description: "Comparable company analysis", category: "Financial Analysis", hint: "MSFT" },
  { name: "/lbo", description: "Leveraged buyout model", category: "Financial Analysis", hint: "company name" },
  { name: "/3-statement-model", description: "Integrated 3-statement model", category: "Financial Analysis", hint: "TSLA" },
  { name: "/competitive-analysis", description: "Competitive landscape analysis", category: "Financial Analysis", hint: "cloud computing" },
  { name: "/check-deck", description: "QC a presentation deck", category: "Financial Analysis" },
  { name: "/debug-model", description: "Debug a financial model", category: "Financial Analysis" },

  // Equity Research
  { name: "/earnings", description: "Quarterly earnings analysis", category: "Equity Research", hint: "NVDA Q4 2024" },
  { name: "/earnings-preview", description: "Pre-earnings research note", category: "Equity Research", hint: "AMZN" },
  { name: "/initiate", description: "Initiating coverage report", category: "Equity Research", hint: "ticker" },
  { name: "/morning-note", description: "Daily morning research note", category: "Equity Research" },
  { name: "/catalysts", description: "Catalyst calendar", category: "Equity Research", hint: "GOOG" },
  { name: "/screen", description: "Stock screening", category: "Equity Research", hint: "criteria" },
  { name: "/sector", description: "Sector overview report", category: "Equity Research", hint: "semiconductors" },
  { name: "/thesis", description: "Investment thesis tracker", category: "Equity Research", hint: "META" },
  { name: "/model-update", description: "Update financial model", category: "Equity Research", hint: "ticker" },

  // Investment Banking
  { name: "/merger-model", description: "Accretion/dilution merger model", category: "Investment Banking", hint: "acquirer + target" },
  { name: "/cim", description: "Confidential Information Memorandum", category: "Investment Banking", hint: "company" },
  { name: "/buyer-list", description: "Strategic & financial buyer list", category: "Investment Banking", hint: "target" },
  { name: "/deal-tracker", description: "Deal pipeline tracker", category: "Investment Banking" },
  { name: "/one-pager", description: "Executive summary one-pager", category: "Investment Banking", hint: "company" },
  { name: "/process-letter", description: "Sell-side process letter", category: "Investment Banking" },
  { name: "/teaser", description: "Anonymous teaser", category: "Investment Banking", hint: "target" },

  // Private Equity
  { name: "/screen-deal", description: "Screen PE deal opportunities", category: "Private Equity", hint: "criteria" },
  { name: "/ic-memo", description: "Investment Committee memo", category: "Private Equity", hint: "company" },
  { name: "/dd-prep", description: "Due diligence preparation", category: "Private Equity", hint: "target" },
  { name: "/dd-checklist", description: "Due diligence checklist", category: "Private Equity" },
  { name: "/returns", description: "PE returns analysis (IRR, MOIC)", category: "Private Equity" },
  { name: "/portfolio", description: "Portfolio company review", category: "Private Equity" },
  { name: "/value-creation", description: "Value creation plan", category: "Private Equity", hint: "company" },
  { name: "/unit-economics", description: "Unit economics analysis", category: "Private Equity", hint: "company" },
  { name: "/source", description: "Deal sourcing", category: "Private Equity", hint: "sector" },
  { name: "/ai-readiness", description: "AI readiness assessment", category: "Private Equity", hint: "company" },

  // Wealth Management
  { name: "/client-review", description: "Client review presentation", category: "Wealth Management" },
  { name: "/financial-plan", description: "Comprehensive financial plan", category: "Wealth Management" },
  { name: "/client-report", description: "Client portfolio report", category: "Wealth Management" },
  { name: "/proposal", description: "Investment proposal", category: "Wealth Management" },
  { name: "/rebalance", description: "Portfolio rebalancing analysis", category: "Wealth Management" },
  { name: "/tlh", description: "Tax loss harvesting opportunities", category: "Wealth Management" },
];

export const CATEGORIES = [...new Set(COMMANDS.map((c) => c.category))];
