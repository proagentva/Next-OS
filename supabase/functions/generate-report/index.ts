import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { period, year, quarter, data } = body;

    if (!data) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "AI narrative not available — GEMINI_API_KEY is not configured as an edge function secret. The data tables in the report are fully functional without it.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Assemble the data context for the AI
    const periodLabel =
      period === "yearly"
        ? `Year ${year} (YTD)`
        : period === "quarterly"
        ? `Q${quarter} ${year}`
        : `${period} ${year}`;

    const ytdFin = data.financial["YTD"] || {};
    const quarterFin = data.financial[`Q${quarter}`] || {};
    const finData = period === "yearly" ? ytdFin : quarterFin;

    const acqData =
      data.acq[period === "yearly" ? "YTD" : `Q${quarter}`] || {};
    const dispoData =
      data.dispo[period === "yearly" ? "YTD" : `Q${quarter}`] || {};

    // Build comparison data
    const comparisons: string[] = [];
    if (period === "quarterly") {
      for (let q = 1; q <= 4; q++) {
        const f = data.financial[`Q${q}`] || {};
        const a = data.acq[`Q${q}`] || {};
        const d = data.dispo[`Q${q}`] || {};
        comparisons.push(
          `Q${q}: Income=$${f.income || 0}, Expenses=$${f.expenses || 0}, Net=$${f.net_profit || 0}, ACQ Dials=${a.dials || 0}, ACQ Contracts=${a.contracts || 0}, Dispo Deals Locked=${d.deals_locked_up || 0}`
        );
      }
    }

    const expenseBreakdown = Object.entries(finData.by_bucket || {})
      .map(([bucket, amt]) => `${bucket}: $${amt}`)
      .join(", ");

    const marketingBreakdown = (data.marketing || [])
      .map((m: any) => `${m.channel}: $${m.cost}`)
      .join(", ");

    const prompt = `You are a financial and operations analyst for a real-estate wholesaling/investing business. Analyze the following data for ${periodLabel} and produce a written report. Use ONLY the numbers provided below — do not invent or compute any figures not present in the data.

## Current Period Data (${periodLabel})
- Income: $${finData.income || 0}
- Total Expenses: $${finData.expenses || 0}
- Net Profit: $${finData.net_profit || 0}
- Expenses by Bucket: ${expenseBreakdown}

### ACQ Funnel
- Dials: ${acqData.dials || 0}
- Conversations: ${acqData.conversations || 0}
- Leads Pushed: ${acqData.leads_pushed || 0}
- Pass-Offs: ${acqData.pass_offs || 0}
- Appts Set: ${acqData.appts_set || 0}
- Offers: ${acqData.offers || 0}
- Contracts: ${acqData.contracts || 0}
- Closed: ${acqData.closed || 0}

### Dispo Funnel
- Total Dials: ${dispoData.total_dials || 0}
- Calls Connected: ${dispoData.calls_connected || 0}
- Deals Pitched: ${dispoData.deals_pitched || 0}
- Offers Made: ${dispoData.offers_made || 0}
- Deals Locked Up: ${dispoData.deals_locked_up || 0}

### Marketing Cost by Channel
${marketingBreakdown || "No marketing data available"}

## Comparison Periods
${comparisons.join("\n") || "No comparison data available"}

## Instructions
Produce the report in the following structure:

1. **Executive Summary** — a 2-3 sentence tagline summarizing the period's performance.
2. **Trends & Anomalies** — commentary on trends, anomalies, and seasonality (e.g., "building month," "growth slowed vs. prior quarter," "performance held steady").
3. **What's Working** — 2-3 concrete, numbers-backed observations on positive performance.
4. **What's Bleeding** — 2-3 concrete, numbers-backed observations on areas of concern.
5. **Recommendations** — 3-5 prioritized, actionable recommendations.

Keep it concise, professional, and grounded strictly in the provided numbers. Do not state any figure that is not in the data above.`;

    // Call Google's Gemini API (free tier — no billing account required)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({
          error: `AI service error (${response.status}): ${errText}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    const report =
      result.candidates?.[0]?.content?.parts?.[0]?.text || "No report generated.";

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
