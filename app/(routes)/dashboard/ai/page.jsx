"use client";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { db } from "../../../../utils/dbConfig";
import { Budgets, expenses, incomes, incomeEntries } from "../../../../utils/schema";
import { eq, sql, getTableColumns } from "drizzle-orm";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Sparkles } from "lucide-react";

function AiAdvisorPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState("");
  const [financialData, setFinancialData] = useState(null);

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user]);

  const fetchInsights = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.primaryEmailAddress?.emailAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
        setFinancialData(data.financialData);
      } else {
        setInsights("Failed to generate insights. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      setInsights("An error occurred while generating insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-bold text-3xl flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            AI Financial Advisor
          </h2>
          <p className="text-gray-500 mt-1">
            Get personalized insights about your spending and savings
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </button>
      </div>

      {/* Financial Summary Cards */}
      {financialData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total Income</p>
                <h3 className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(financialData.totalIncome)}
                </h3>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="text-green-700 w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                <h3 className="text-2xl font-bold text-red-900 mt-1">
                  {formatCurrency(financialData.totalExpenses)}
                </h3>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <TrendingDown className="text-red-700 w-6 h-6" />
              </div>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${financialData.savings >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-5 rounded-xl border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${financialData.savings >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {financialData.savings >= 0 ? 'Savings' : 'Deficit'}
                </p>
                <h3 className={`text-2xl font-bold mt-1 ${financialData.savings >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  {formatCurrency(Math.abs(financialData.savings))}
                </h3>
              </div>
              <div className={`p-3 rounded-full ${financialData.savings >= 0 ? 'bg-blue-200' : 'bg-orange-200'}`}>
                <DollarSign className={`w-6 h-6 ${financialData.savings >= 0 ? 'text-blue-700' : 'text-orange-700'}`} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Savings Rate</p>
                <h3 className="text-2xl font-bold text-purple-900 mt-1">
                  {financialData.savingsRate}%
                </h3>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Sparkles className="text-purple-700 w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-purple-600 w-5 h-5" />
          <h3 className="font-bold text-xl">AI-Powered Financial Insights</h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Analyzing your financial data...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
          </div>
        ) : (
          <div className="prose max-w-none">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {insights}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Budget Breakdown */}
      {financialData && financialData.budgets.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-bold text-xl mb-4">Budget Breakdown</h3>
          <div className="space-y-4">
            {financialData.budgets.map((budget, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{budget.name}</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      budget.percentageUsed > 100
                        ? 'bg-red-600'
                        : budget.percentageUsed > 80
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {budget.percentageUsed}% used
                  </span>
                  <span className={`text-xs font-medium ${
                    budget.remaining < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {budget.remaining >= 0 ? 'Remaining: ' : 'Over: '}
                    {formatCurrency(Math.abs(budget.remaining))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AiAdvisorPage;
