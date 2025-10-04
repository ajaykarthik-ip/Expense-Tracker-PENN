import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { db } from "../../../../utils/dbConfig";
import { Budgets, expenses, incomes, incomeEntries } from "../../../../utils/schema";
import { eq, sql, getTableColumns } from "drizzle-orm";

export async function POST(req) {
  try {
    const { userEmail } = await req.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    // Fetch all user's budgets with their expenses
    const budgetList = await db
      .select({
        ...getTableColumns(Budgets),
        totalSpend: sql`sum(${expenses.amount})`.mapWith(Number),
        totalItem: sql`count(${expenses.id})`.mapWith(Number),
      })
      .from(Budgets)
      .leftJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.createdBy, userEmail))
      .groupBy(Budgets.id);

    // Fetch all expenses
    const allExpenses = await db
      .select({
        id: expenses.id,
        name: expenses.name,
        amount: expenses.amount,
        createdAt: expenses.createdAt,
        budgetName: Budgets.name,
      })
      .from(Budgets)
      .rightJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.createdBy, userEmail));

    // Fetch income data
    const incomeSources = await db
      .select()
      .from(incomes)
      .where(eq(incomes.createdBy, userEmail));

    let totalIncome = 0;
    if (incomeSources.length > 0) {
      const allIncomeEntries = await db
        .select()
        .from(incomeEntries)
        .where(eq(incomeEntries.createdBy, userEmail));

      totalIncome = allIncomeEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    }

    // Calculate totals
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const savings = totalIncome - totalExpenses;

    // Prepare data for AI
    const financialData = {
      totalIncome,
      totalExpenses,
      savings,
      savingsRate: totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(2) : 0,
      budgets: budgetList.map(b => ({
        name: b.name,
        allocated: Number(b.amount),
        spent: b.totalSpend || 0,
        remaining: Number(b.amount) - (b.totalSpend || 0),
        percentageUsed: ((b.totalSpend || 0) / Number(b.amount) * 100).toFixed(2)
      })),
      recentExpenses: allExpenses.slice(0, 10).map(e => ({
        name: e.name,
        amount: Number(e.amount),
        budget: e.budgetName,
        date: e.createdAt
      }))
    };

    // Initialize Gemini AI with new SDK
    const ai = new GoogleGenAI({});

    // Create prompt for AI
    const prompt = `You are a personal financial advisor. Analyze the following financial data and provide insights in a friendly, conversational tone.

Financial Summary:
- Total Income: $${financialData.totalIncome}
- Total Expenses: $${financialData.totalExpenses}
- Savings: $${financialData.savings}
- Savings Rate: ${financialData.savingsRate}%

Budgets:
${financialData.budgets.map(b => `- ${b.name}: Allocated $${b.allocated}, Spent $${b.spent} (${b.percentageUsed}% used), Remaining $${b.remaining}`).join('\n')}

Recent Expenses:
${financialData.recentExpenses.map(e => `- ${e.name}: $${e.amount} (${e.budget} budget)`).join('\n')}

Please provide:
1. A brief overview of their financial health (2-3 sentences)
2. Key observations about their spending patterns
3. Which budgets are overspent or close to the limit
4. Specific actionable recommendations to improve their finances (at least 3-4 tips)
5. Positive reinforcement if they're doing well

Format your response in clear sections with bullet points. Be encouraging and supportive.`;

    // Generate AI insights using new SDK
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disable thinking for faster response
        },
      }
    });

    const insights = response.text;

    return NextResponse.json({
      success: true,
      insights,
      financialData
    });

  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights", details: error.message },
      { status: 500 }
    );
  }
}
