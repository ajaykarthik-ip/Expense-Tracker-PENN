"use client";
import React, { useEffect, useState } from "react";
import CreateBudget from "./CreateBudget";
import { eq, getTableColumns, sql, desc } from "drizzle-orm";
import { useUser } from "@clerk/nextjs";
import { Budgets, expenses, incomes, incomeEntries } from "../../../../../utils/schema";
import { db } from "../../../../../utils/dbConfig";
import { Button } from "../../../../../components/ui/button";

function BudgetList() {
  const [budgetList, setBudgetList] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalBudgetAllocated, setTotalBudgetAllocated] = useState(0);
  const [savings, setSavings] = useState(0);
  const [incomeSource, setIncomeSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user } = useUser();
  
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Update savings whenever income or expenses change
  useEffect(() => {
    const calculatedSavings = totalIncome - totalExpenses;
    setSavings(calculatedSavings);
  }, [totalIncome, totalExpenses]);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      getBudgetList(),
      getIncomeData()
    ]);
    setIsLoading(false);
  };

  const getBudgetList = async () => {
    const result = await db
      .select({
        ...getTableColumns(Budgets),
        totalSpend: sql`sum(${expenses.amount})`.mapWith(Number),
        totalItem: sql`count(${expenses.id})`.mapWith(Number),
      })
      .from(Budgets)
      .leftJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.createdBy, user.primaryEmailAddress.emailAddress))
      .groupBy(Budgets.id)
      .orderBy(desc(Budgets.id));

    setBudgetList(result);
    
    // Calculate total budget allocated
    const totalAllocated = result.reduce((sum, budget) => sum + Number(budget.amount), 0);
    setTotalBudgetAllocated(totalAllocated);
    
    // Calculate and update total expenses
    await getAllExpenses();
  };

  const getAllExpenses = async () => {
    const result = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
      })
      .from(Budgets)
      .rightJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.createdBy, user?.primaryEmailAddress.emailAddress));
    
    // Calculate total expenses
    const total = result.reduce((sum, expense) => sum + Number(expense.amount), 0);
    setTotalExpenses(total);
  };

  const getIncomeData = async () => {
    try {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      const userEmail = user.primaryEmailAddress.emailAddress;
      
      // Check if user already has an income source
      const existingSources = await db.select()
        .from(incomes)
        .where(eq(incomes.createdBy, userEmail));
      
      if (existingSources.length > 0) {
        // User already has an income source
        setIncomeSource(existingSources[0]);
        loadIncomeEntries(existingSources[0].id);
      }
    } catch (error) {
      console.error("Error fetching income data:", error);
    }
  };

  const loadIncomeEntries = async (sourceId) => {
    try {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      const userEmail = user.primaryEmailAddress.emailAddress;
      
      // Calculate total from all income entries
      const allEntries = await db.select()
        .from(incomeEntries)
        .where(
          eq(incomeEntries.incomeId, sourceId),
          eq(incomeEntries.createdBy, userEmail)
        );
      
      const total = allEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      setTotalIncome(total);
    } catch (error) {
      console.error("Error loading income entries:", error);
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    
    // Format with thousand separators and no decimals
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: absAmount >= 1000000 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(absAmount);
    
    return isNegative ? `-${formatted}` : formatted;
  };

  // Function to refresh all data
  const refreshData = async () => {
    await loadAllData();
    // Close modal after successful creation
    setIsModalOpen(false);
  };

  // Get financial health status
  const getFinancialHealthStatus = () => {
    if (totalIncome === 0) return { label: "No Income", color: "bg-gray-500", textColor: "text-white" };
    
    const ratio = totalExpenses / totalIncome;
    
    if (ratio > 1) {
      return { label: "Over Budget", color: "bg-red-600", textColor: "text-white" };
    } else if (ratio > 0.9) {
      return { label: "At Risk", color: "bg-amber-500", textColor: "text-white" };
    } else if (ratio > 0.7) {
      return { label: "Caution", color: "bg-amber-300", textColor: "text-black" };
    } else {
      return { label: "Healthy", color: "bg-green-500", textColor: "text-white" };
    }
  };

  // Budget progress percentage
  const getBudgetProgress = () => {
    if (totalIncome === 0) return 0;
    return Math.min(Math.round((totalExpenses / totalIncome) * 100), 100);
  };

  const healthStatus = getFinancialHealthStatus();
  const budgetProgress = getBudgetProgress();

  // Get the appropriate icon based on budget category
  const getBudgetTypeIcon = (name) => {
    const lowerName = name ? name.toLowerCase() : '';
    
    if (lowerName.includes('income') || lowerName.includes('freelance') || lowerName.includes('investment')) {
      return "💰";
    } else if (lowerName.includes('business') || lowerName.includes('recurring')) {
      return "📊";
    } else {
      return "📊";
    }
  };

  // Budget card component with strict sizing and consistent layout
  const BudgetCard = ({ budget }) => {
    const totalSpent = budget.totalSpend || 0;
    const remaining = Number(budget.amount) - totalSpent;
    const usagePercent = Math.min(Math.round((totalSpent / Number(budget.amount)) * 100), 100) || 0;
    const isOverBudget = remaining < 0;
    
    // Determine icon for this budget
    const icon = getBudgetTypeIcon(budget.name);
    
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 h-[190px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mr-3">
              {icon}
            </div>
            <p className="font-medium text-gray-800 truncate w-24">{budget.name}</p>
          </div>
          <p className="text-base font-bold text-blue-600">{formatCurrency(budget.amount)}</p>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm text-gray-500">{budget.totalItem || 0} items</p>
              <p className="text-sm font-medium text-gray-700">{usagePercent}% used</p>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div 
                className={`h-1.5 rounded-full ${
                  usagePercent >= 100 ? 'bg-red-600' : 
                  usagePercent > 70 ? 'bg-amber-500' : 
                  'bg-green-600'
                }`}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{formatCurrency(totalSpent)}</span> spent
            </div>
            <div className="text-sm">
              <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCurrency(remaining)}
              </span> remaining
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton card with exact same dimensions
  const LoadingSkeletonCard = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 h-[190px] flex flex-col">
        <div className="p-4 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse mr-3"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between mb-3">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full w-full mb-5 animate-pulse"></div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  };

  // Modal component for Create Budget
  const CreateBudgetModal = () => {
    if (!isModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Create New Budget</h2>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            <CreateBudget 
              refreshData={refreshData} 
              totalIncome={totalIncome} 
              totalExpenses={totalExpenses}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Financial Overview Section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-lg">Budget Overview</h2>
          <p className="text-gray-500 text-sm">Manage and track your budgets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-5">
            <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
            <div className="mt-2 text-xs text-gray-500">
              {incomeSource ? `Primary: ${incomeSource.name}` : "No income source"}
            </div>
          </div>
          
          <div className="p-5">
            <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
            <div className="mt-2 text-xs text-gray-500">
              {budgetList.length} active budget{budgetList.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="p-5">
            <h3 className="text-sm font-medium text-gray-500">Savings</h3>
            <p className={`text-2xl font-bold mt-1 ${savings >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {formatCurrency(savings)}
            </p>
            <div className="mt-2 text-xs">
              <span className={`inline-block px-2 py-1 rounded-full ${healthStatus.color} ${healthStatus.textColor}`}>
                {healthStatus.label}
              </span>
            </div>
          </div>
          
          <div className="p-5">
            <h3 className="text-sm font-medium text-gray-500">Budget Usage</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{budgetProgress}%</p>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className={`h-2.5 rounded-full ${
                  budgetProgress > 90 ? 'bg-red-600' : 
                  budgetProgress > 70 ? 'bg-amber-500' : 
                  'bg-green-600'
                }`}
                style={{ width: `${budgetProgress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {formatCurrency(totalExpenses)} of {formatCurrency(totalIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* View Selector and Add Budget Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden flex">
            <button 
              onClick={() => setActiveView("grid")}
              className={`px-4 py-2 text-sm font-medium transition ${activeView === "grid" 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Grid View
            </button>
            <button 
              onClick={() => setActiveView("list")}
              className={`px-4 py-2 text-sm font-medium transition ${activeView === "list" 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              List View
            </button>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
          >
            <span className="mr-1">+</span> New Budget
          </button>
        </div>
        
        <div className="text-sm text-gray-600 font-medium">
          {budgetList.length} budget{budgetList.length !== 1 ? 's' : ''} • {formatCurrency(totalBudgetAllocated)} allocated
        </div>
      </div>

      {/* Grid View */}
      {activeView === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {isLoading ? (
            // Loading skeletons with consistent sizing
            Array(8).fill().map((_, index) => (
              <LoadingSkeletonCard key={index} />
            ))
          ) : budgetList.length > 0 ? (
            // Budget cards with consistent sizing
            budgetList.map((budget, index) => (
              <BudgetCard key={index} budget={budget} />
            ))
          ) : (
            <div className="col-span-full bg-white p-8 rounded-lg shadow-sm text-center border border-gray-100">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                <span className="text-4xl">🏦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Budgets Yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first budget to start managing your finances effectively.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Budgets help you plan your spending and track your financial goals.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"
              >
                Create Your First Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {activeView === "list" && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          {isLoading ? (
            <div className="p-5">
              <div className="space-y-4">
                {Array(5).fill().map((_, index) => (
                  <div key={index} className="h-16 bg-gray-50 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : budgetList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-y border-gray-100">
                  <tr>
                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Name</th>
                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {budgetList.map((budget, index) => {
                    const totalSpent = budget.totalSpend || 0;
                    const remaining = Number(budget.amount) - totalSpent;
                    const usagePercent = Math.min(Math.round((totalSpent / Number(budget.amount)) * 100), 100) || 0;
                    const isOverBudget = remaining < 0;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mr-2">
                              <span>{getBudgetTypeIcon(budget.name)}</span>
                            </div>
                            <div className="font-medium text-gray-800">{budget.name}</div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-blue-600">
                          {formatCurrency(budget.amount)}
                        </td>
                        <td className="p-4 whitespace-nowrap text-gray-600">
                          {formatCurrency(totalSpent)}
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium">
                          <span className={isOverBudget ? 'text-red-600' : 'text-gray-800'}>
                            {formatCurrency(remaining)}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2 max-w-28">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  usagePercent >= 100 ? 'bg-red-600' : 
                                  usagePercent > 70 ? 'bg-amber-500' : 
                                  'bg-green-600'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600">{usagePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                <span className="text-4xl">🏦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Budgets Yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first budget to start managing your finances effectively.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Tracking your budgets helps you stay on top of your financial goals.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"
              >
                Create Your First Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Budget Modal */}
      <CreateBudgetModal />
    </div>
  );
}

export default BudgetList;