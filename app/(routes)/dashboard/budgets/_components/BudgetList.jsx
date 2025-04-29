"use client";
import React, { useEffect, useState } from "react";
import { eq, getTableColumns, sql, desc } from "drizzle-orm";
import { useUser } from "@clerk/nextjs";
import { Budgets, expenses, incomes, incomeEntries } from "../../../../../utils/schema";
import { db } from "../../../../../utils/dbConfig";
import { Button } from "../../../../../components/ui/button";
import { 
  PlusCircle, 
  DollarSign, 
  CreditCard, 
  PiggyBank, 
  BarChart, 
  Grid, 
  List, 
  RefreshCw, 
  Trash2, 
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

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
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state for budget creation
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetDescription, setBudgetDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const refreshAllData = async () => {
    setRefreshing(true);
    await loadAllData();
    setTimeout(() => {
      setRefreshing(false);
    }, 600); // Show refresh animation for at least 600ms for better UX
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
  
  // Validate budget amount against available balance
  const validateBudgetAmount = (amount) => {
    // Clear previous errors
    setFormError("");
    setShowConfirmation(false);
    
    // Check if value is a valid number
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Please enter a valid positive amount");
      return false;
    }
    
    // Calculate available balance
    const availableBalance = totalIncome - totalExpenses;
    
    // Check if amount exceeds available balance
    if (numericAmount > availableBalance) {
      setShowConfirmation(true);
      return false;
    }
    
    return true;
  };
  
  // Handle amount change with validation - no longer needed as handling in input onChange
  const handleBudgetAmountChange = (e) => {
    const value = e.target.value;
    setBudgetAmount(value);
    
    // Validate on input change for immediate feedback
    if (value) validateBudgetAmount(value);
  };
  
  const handleCreateBudget = async (e, isConfirmed = false) => {
    e.preventDefault();
    
    if (!budgetName.trim()) {
      setFormError("Budget name is required");
      return;
    }
    
    // Skip validation if already confirmed
    if (!isConfirmed) {
      // Validate amount before submission
      if (!budgetAmount || !validateBudgetAmount(budgetAmount)) {
        // If there's a confirmation needed and user hasn't confirmed yet
        if (showConfirmation) {
          return; // Stop here and wait for confirmation
        }
      }
    }
    
    try {
      setIsSubmitting(true);
      
      // Format the amount to ensure it's a number
      const formattedAmount = parseFloat(parseFloat(budgetAmount).toFixed(2));
      
      // Insert new budget into database
      await db.insert(Budgets).values({
        name: budgetName,
        amount: formattedAmount,
        description: budgetDescription.trim() || null,
        createdBy: user.primaryEmailAddress.emailAddress,
        createdAt: new Date(),
      });
      
      // Reset form and refresh data
      setBudgetName("");
      setBudgetAmount("");
      setBudgetDescription("");
      setFormError("");
      setShowConfirmation(false);
      
      // Refresh the budget list and close modal
      refreshData();
    } catch (error) {
      console.error("Error creating budget:", error);
      setFormError("An error occurred while creating the budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get financial health status
  const getFinancialHealthStatus = () => {
    if (totalIncome === 0) return { 
      label: "No Income", 
      color: "bg-gray-500", 
      textColor: "text-white",
      icon: <Clock size={14} className="mr-1" />
    };
    
    const ratio = totalExpenses / totalIncome;
    
    if (ratio > 1) {
      return { 
        label: "Over Budget", 
        color: "bg-red-600", 
        textColor: "text-white",
        icon: <AlertCircle size={14} className="mr-1" />
      };
    } else if (ratio > 0.9) {
      return { 
        label: "At Risk", 
        color: "bg-amber-500", 
        textColor: "text-white",
        icon: <AlertCircle size={14} className="mr-1" />
      };
    } else if (ratio > 0.7) {
      return { 
        label: "Caution", 
        color: "bg-amber-300", 
        textColor: "text-black",
        icon: <Clock size={14} className="mr-1" />
      };
    } else {
      return { 
        label: "Healthy", 
        color: "bg-green-500", 
        textColor: "text-white",
        icon: <CheckCircle size={14} className="mr-1" />
      };
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
  const getBudgetIcon = (name) => {
    const lowerName = name ? name.toLowerCase() : '';
    
    if (lowerName.includes('income') || lowerName.includes('freelance') || lowerName.includes('investment')) {
      return <DollarSign size={18} className="text-green-500" />;
    } else if (lowerName.includes('food') || lowerName.includes('groceries') || lowerName.includes('restaurant')) {
      return <CreditCard size={18} className="text-amber-500" />;
    } else if (lowerName.includes('saving') || lowerName.includes('emergency')) {
      return <PiggyBank size={18} className="text-blue-500" />;
    } else if (lowerName.includes('business') || lowerName.includes('recurring')) {
      return <BarChart size={18} className="text-purple-500" />;
    } else {
      return <BarChart size={18} className="text-gray-500" />;
    }
  };

  // Budget card component with improved styling
  const BudgetCard = ({ budget }) => {
    const totalSpent = budget.totalSpend || 0;
    const remaining = Number(budget.amount) - totalSpent;
    const usagePercent = Math.min(Math.round((totalSpent / Number(budget.amount)) * 100), 100) || 0;
    const isOverBudget = remaining < 0;
    
    // Determine progress color
    let progressColor = "bg-green-500";
    if (usagePercent > 90) progressColor = "bg-red-500";
    else if (usagePercent > 70) progressColor = "bg-amber-500";
    
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow h-[210px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 mr-3">
              {getBudgetIcon(budget.name)}
            </div>
            <div>
              <p className="font-medium text-gray-800 truncate w-32">{budget.name}</p>
              <p className="text-xs text-gray-500">{budget.totalItem || 0} transactions</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-blue-600">{formatCurrency(budget.amount)}</p>
            <p className="text-xs text-gray-500">Budget limit</p>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-sm text-gray-600">Budget Usage</p>
              <p className="text-sm font-medium text-gray-700">{usagePercent}%</p>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full ${progressColor}`}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1">Spent</p>
                <p className="text-sm font-medium text-gray-800">{formatCurrency(totalSpent)}</p>
              </div>
              
              <div className={`rounded-lg p-2 ${isOverBudget ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Remaining</p>
                <p className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton card with improved styling
  const LoadingSkeletonCard = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 h-[210px] flex flex-col">
        <div className="p-4 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-9 w-9 bg-gray-100 rounded-full animate-pulse mr-3"></div>
            <div>
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse mb-1"></div>
            <div className="h-3 w-12 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between mb-3">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-4 w-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full w-full mb-4 animate-pulse"></div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mb-1"></div>
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mb-1"></div>
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simple Budget Modal - brand new implementation
  const CreateBudgetModal = () => {
    if (!isModalOpen) return null;
    
    // Local state for form - completely isolated from parent component
    const [localState, setLocalState] = useState({
      name: "",
      amount: "",
      description: ""
    });
    
    const [localError, setLocalError] = useState("");
    const [localConfirm, setLocalConfirm] = useState(false);
    const [localSubmitting, setLocalSubmitting] = useState(false);
    
    // Calculate available balance
    const availableBalance = totalIncome - totalExpenses;
    
    // Format currency without any performance issues
    const formatCurrencyValue = (value) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(value);
    };
    
    // Change handler that won't interfere with typing
    const handleChange = (e) => {
      const { name, value } = e.target;
      setLocalState(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear any errors/confirmations when user is typing
      setLocalError("");
      setLocalConfirm(false);
    };
    
    // Handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Basic validation
      if (!localState.name.trim()) {
        setLocalError("Budget name is required");
        return;
      }
      
      const amountValue = parseFloat(localState.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setLocalError("Please enter a valid amount");
        return;
      }
      
      // Check if exceeds available balance
      if (amountValue > availableBalance && !localConfirm) {
        setLocalConfirm(true);
        return;
      }
      
      try {
        setLocalSubmitting(true);
        
        // Save to database
        await db.insert(Budgets).values({
          name: localState.name.trim(),
          amount: amountValue,
          description: localState.description.trim() || null,
          createdBy: user.primaryEmailAddress.emailAddress,
          createdAt: new Date()
        });
        
        // Close modal and refresh data
        setIsModalOpen(false);
        refreshData();
      } catch (error) {
        console.error("Error creating budget:", error);
        setLocalError("Failed to create budget. Please try again.");
      } finally {
        setLocalSubmitting(false);
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Budget</h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-blue-100"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Available Balance */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5">
                <div className="flex items-center">
                  <PiggyBank className="text-blue-600 mr-2" size={20} />
                  <span className="text-sm font-medium text-gray-700">Available Balance:</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {formatCurrencyValue(availableBalance)}
                </p>
              </div>
              
              {/* Budget Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={localState.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Groceries, Rent, Entertainment"
                />
              </div>
              
              {/* Budget Amount */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    name="amount"
                    value={localState.amount}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              {/* Description */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={localState.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Add additional details about this budget"
                ></textarea>
              </div>
              
              {/* Error Message */}
              {localError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-4">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <p className="text-sm">{localError}</p>
                </div>
              )}
              
              {/* Confirmation */}
              {localConfirm && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
                  <div className="flex items-start">
                    <AlertCircle size={18} className="mr-2 mt-0.5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Are you sure you want to add this? The amount exceeds your available balance.
                      </p>
                      <div className="flex space-x-3 mt-3">
                        <button 
                          type="button" 
                          className="px-3 py-1.5 text-sm border border-amber-300 text-amber-800 rounded-md hover:bg-amber-100"
                          onClick={() => setLocalConfirm(false)}
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleSubmit}
                          className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700"
                        >
                          Confirm Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              {!localConfirm && (
                <button
                  type="submit"
                  disabled={localSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center"
                >
                  {localSubmitting ? (
                    <>
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Budget"
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-screen-2xl mx-auto">
      {/* Financial Overview Section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-xl text-gray-800">Budget Overview</h2>
            <p className="text-gray-500 text-sm">Manage and track your financial progress</p>
          </div>
          
          <button 
            onClick={refreshAllData}
            className={`h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-green-50 text-green-600 mr-3">
                <DollarSign size={18} />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Total Income</h3>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-1">{formatCurrency(totalIncome)}</p>
            <div className="text-xs text-gray-500 flex items-center">
              {incomeSource ? (
                <>
                  <DollarSign size={12} className="mr-1" />
                  <span>{incomeSource.name}</span>
                </>
              ) : "No income source added"}
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 mr-3">
                <CreditCard size={18} />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Total Expenses</h3>
            </div>
            <p className="text-2xl font-bold text-red-600 mb-1">{formatCurrency(totalExpenses)}</p>
            <div className="text-xs text-gray-500 flex items-center">
              <BarChart size={12} className="mr-1" />
              <span>
                {budgetList.length} active budget{budgetList.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mr-3">
                <PiggyBank size={18} />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Savings</h3>
            </div>
            <p className={`text-2xl font-bold mb-1 ${savings >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {formatCurrency(savings)}
            </p>
            <div className="text-xs flex items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full ${healthStatus.color} ${healthStatus.textColor}`}>
                {healthStatus.icon}
                {healthStatus.label}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 mr-3">
                <BarChart size={18} />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Budget Usage</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{budgetProgress}%</p>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1.5">
              <div 
                className={`h-2.5 rounded-full ${
                  budgetProgress > 90 ? 'bg-red-600' : 
                  budgetProgress > 70 ? 'bg-amber-500' : 
                  'bg-green-600'
                }`}
                style={{ width: `${budgetProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {formatCurrency(totalExpenses)} of {formatCurrency(totalIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* View Selector and Add Budget Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden flex">
            <button 
              onClick={() => setActiveView("grid")}
              className={`px-4 py-2 text-sm font-medium transition flex items-center ${activeView === "grid" 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Grid size={16} className="mr-1.5" />
              Grid
            </button>
            <button 
              onClick={() => setActiveView("list")}
              className={`px-4 py-2 text-sm font-medium transition flex items-center ${activeView === "list" 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <List size={16} className="mr-1.5" />
              List
            </button>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
          >
            <PlusCircle size={16} className="mr-1.5" />
            New Budget
          </button>
        </div>
        
        <div className="text-sm text-gray-600 font-medium bg-white py-1.5 px-3 rounded-lg shadow-sm border border-gray-100">
          <span className="text-blue-600 font-bold">{formatCurrency(totalBudgetAllocated)}</span> allocated across {budgetList.length} budget{budgetList.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grid View */}
      {activeView === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
            <div className="col-span-full bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                <PiggyBank size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Budgets Yet</h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                Create your first budget to start managing your finances effectively.
              </p>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                Budgets help you plan your spending and track your financial goals.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center mx-auto"
              >
                <PlusCircle size={16} className="mr-1.5" />
                Create Your First Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {activeView === "list" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
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
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Name</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-50 mr-3">
                              {getBudgetIcon(budget.name)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{budget.name}</div>
                              <div className="text-xs text-gray-500">{budget.totalItem || 0} transactions</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-blue-600">{formatCurrency(budget.amount)}</div>
                          <div className="text-xs text-gray-500">Budget limit</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">{formatCurrency(totalSpent)}</div>
                          <div className="text-xs text-gray-500">
                            {usagePercent}% of total
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(remaining)}
                          </span>
                          <div className="text-xs text-gray-500">
                            {isOverBudget ? 'Over budget' : 'Available'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-3 max-w-28">
                              <div 
                                className={`h-2 rounded-full ${
                                  usagePercent >= 100 ? 'bg-red-600' : 
                                  usagePercent > 70 ? 'bg-amber-500' : 
                                  'bg-green-600'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-8">{usagePercent}%</span>
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
                <PiggyBank size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Budgets Yet</h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                Create your first budget to start managing your finances effectively.
              </p>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                Tracking your budgets helps you stay on top of your financial goals.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center mx-auto"
              >
                <PlusCircle size={16} className="mr-1.5" />
                Create Your First Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Budget Modal */}
      <CreateBudgetModal />
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default BudgetList;