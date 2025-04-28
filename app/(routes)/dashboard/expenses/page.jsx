"use client";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { db } from "../../../../utils/dbConfig";
import { Budgets, expenses } from "../../../../utils/schema";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import ExpenseListTable from "./_components/ExpenseListTable";
import { PlusCircle, Filter, ArrowUpDown, RefreshCw, AlertCircle, Check, X } from "lucide-react";

function ExpensesPage() {
  const [budgetList, setBudgetList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const { user } = useUser();
  
  // Form state
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  
  useEffect(() => {
    if (user) {
      getBudgetList();
    }
  }, [user]);

  // Set the first budget as selected when budgetList is loaded
  useEffect(() => {
    if (budgetList.length > 0 && !selectedBudgetId) {
      console.log("Setting initial budget ID:", budgetList[0].id);
      setSelectedBudgetId(budgetList[0].id.toString());
    }
  }, [budgetList, selectedBudgetId]);

  const getBudgetList = async () => {
    setIsLoading(true);
    try {
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
      getAllExpenses();
    } catch (error) {
      console.error("Error fetching budget list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllExpenses = async () => {
    try {
      const result = await db
        .select({
          id: expenses.id,
          name: expenses.name,
          amount: expenses.amount,
          createdAt: expenses.createdAt,
          budgetId: expenses.budgetId,
          budgetName: Budgets.name,
        })
        .from(Budgets)
        .rightJoin(expenses, eq(Budgets.id, expenses.budgetId))
        .where(eq(Budgets.createdBy, user?.primaryEmailAddress.emailAddress))
        .orderBy(desc(expenses.id));
      
      setExpensesList(result);
      
      // Calculate total expenses
      const total = result.reduce((sum, expense) => sum + Number(expense.amount), 0);
      setTotalExpenses(total);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };
  
  const handleBudgetChange = (e) => {
    const newBudgetId = e.target.value;
    // Make sure we're setting this as a number if it's a numeric string
    // Some database systems return string IDs even for numeric values
    setSelectedBudgetId(newBudgetId);
    
    // For debugging
    console.log('Budget changed to ID:', newBudgetId);
    const selectedBudget = budgetList.find(b => b.id.toString() === newBudgetId.toString());
    if (selectedBudget) {
      console.log('Selected Budget:', selectedBudget);
      console.log('Budget Amount:', selectedBudget.amount);
      console.log('Total Spend:', selectedBudget.totalSpend);
      console.log('Remaining:', selectedBudget.amount - (selectedBudget.totalSpend || 0));
    } else {
      console.log('No matching budget found for ID:', newBudgetId);
      console.log('Available budgets:', budgetList.map(b => ({ id: b.id, name: b.name })));
    }
  };
  
  // Pre-submission handler - Shows the confirmation modal
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form fields
    if (!expenseName.trim()) {
      setMessage("Please enter an expense name");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setMessage("Please enter a valid amount");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    if (!selectedBudgetId) {
      setMessage("Please select a budget category");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    // Store the submission details
    setPendingSubmission({
      name: expenseName.trim(),
      amount: parseFloat(expenseAmount),
      budgetId: selectedBudgetId.toString()
    });
    
    // Show the confirmation modal
    setShowConfirmModal(true);
  };
  
  // Actual submission after confirmation
  const confirmSubmission = async () => {
    if (!pendingSubmission) return;
    
    setIsSubmitting(true);
    
    try {
      // Add expense to the database
      await db.insert(expenses).values({
        name: pendingSubmission.name,
        amount: pendingSubmission.amount,
        budgetId: pendingSubmission.budgetId,
        createdBy: user.primaryEmailAddress.emailAddress,
        createdAt: new Date(),
      });
      
      // Reset form fields
      setExpenseName("");
      setExpenseAmount("");
      
      // Show success message
      setMessage("New Expense Added");
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage("");
      }, 3000);
      
      // Refresh data to show the new expense
      getBudgetList();
    } catch (error) {
      console.error("Error adding expense:", error);
      setMessage("Error adding expense");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsSubmitting(false);
      // Close the modal
      setShowConfirmModal(false);
      // Clear pending submission
      setPendingSubmission(null);
    }
  };
  
  // Cancel submission
  const cancelSubmission = () => {
    setShowConfirmModal(false);
    setPendingSubmission(null);
  };

  // Format currency for display
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  // Get selected budget details
  const getSelectedBudget = () => {
    if (!selectedBudgetId) return null;
    
    // Convert IDs to strings for comparison to handle different types (string vs number)
    return budgetList.find(b => b.id.toString() === selectedBudgetId.toString()) || null;
  };
  
  // Calculate budget remaining
  const getBudgetRemaining = (budget) => {
    if (!budget) return 0;
    // Make sure to handle null or undefined totalSpend correctly
    // totalSpend could be null if there are no expenses yet for this budget
    const totalSpendAmount = budget.totalSpend !== null && budget.totalSpend !== undefined ? Number(budget.totalSpend) : 0;
    return Number(budget.amount) - totalSpendAmount;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Expense Management</h1>
        <p className="text-gray-500 mt-2">Track and manage your expenses across all budgets</p>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">{formatCurrency(totalExpenses)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <PlusCircle size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">{expensesList.length} transactions</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Budgets</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">{budgetList.length}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <ArrowUpDown size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {budgetList.length > 0 
              ? `${budgetList[0].name} is your most recent budget` 
              : 'No active budgets'}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">
                {formatCurrency(expensesList
                  .filter(exp => new Date(exp.createdAt).getMonth() === new Date().getMonth())
                  .reduce((sum, exp) => sum + Number(exp.amount), 0))}
              </h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <Filter size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {expensesList.filter(exp => new Date(exp.createdAt).getMonth() === new Date().getMonth()).length} transactions this month
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Expenses List Section */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-800">Expense History</h2>
              <button 
                onClick={() => getBudgetList()} 
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
            
            <div className="p-5">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : expensesList.length > 0 ? (
                <ExpenseListTable
                  expensesList={expensesList}
                  refreshData={() => getBudgetList()}
                />
              ) : (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <PlusCircle size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-1">No expenses yet</h3>
                  <p className="text-gray-500 mb-4">Start tracking your spending by adding an expense</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Add Expense Section */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-800">Add New Expense</h2>
              <p className="text-sm text-gray-500 mt-1">Record your spending to stay on budget</p>
            </div>
            
            <div className="p-5">
              {budgetList.length > 0 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Budget Category</label>
                    <div className="relative">
                      <select 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
                        value={selectedBudgetId?.toString() || ''}
                        onChange={handleBudgetChange}
                      >
                        <option value="" disabled>Select Budget Category</option>
                        {budgetList.map(budget => (
                          <option key={budget.id} value={budget.id.toString()}>
                            {budget.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Budget details - Always show budget remaining when a budget is selected */}
                    {selectedBudgetId && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Budget Remaining:</span>
                          <span className={`font-medium ${
                            getBudgetRemaining(getSelectedBudget()) > 0 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(getBudgetRemaining(getSelectedBudget()))}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total Budget: {formatCurrency(getSelectedBudget()?.amount)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Form integrated directly in ExpensesPage */}
                  <form onSubmit={handleFormSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expense Name
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Groceries"
                        value={expenseName}
                        onChange={(e) => setExpenseName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expense Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 100"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedBudgetId || !expenseName.trim() || !expenseAmount}
                      className={`w-full py-3 px-4 mt-4 ${
                        !selectedBudgetId || !expenseName.trim() || !expenseAmount 
                          ? 'bg-blue-400' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        "Add New Expense"
                      )}
                    </button>
                  </form>
                  
                  {/* Success/Error Message */}
                  {message && (
                    <div className={`mt-4 p-3 ${
                      message.includes("Error") ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    } rounded-lg text-center`}>
                      {message}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-1">No Budgets Available</h3>
                  <p className="text-gray-500 mb-4">Create a budget first to start tracking expenses</p>
                  <a 
                    href="/dashboard/budgets" 
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Budget
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4 text-blue-600">
              <AlertCircle size={24} className="mr-2" />
              <h3 className="text-lg font-semibold">Confirm Expense</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">Are you sure you want to add this expense?</p>
              
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Budget:</span>
                  <span className="font-medium">
                    {getSelectedBudget()?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expense:</span>
                  <span className="font-medium">{pendingSubmission?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium">{formatCurrency(pendingSubmission?.amount || 0)}</span>
                </div>
                
                {/* Show warning if expense exceeds budget */}
                {getSelectedBudget() && getBudgetRemaining(getSelectedBudget()) < pendingSubmission?.amount && (
                  <div className="mt-2 p-2 bg-red-50 text-red-600 rounded flex items-start">
                    <AlertCircle size={18} className="mr-1 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      This expense exceeds your remaining budget of {formatCurrency(getBudgetRemaining(getSelectedBudget()))}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelSubmission}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="flex items-center justify-center">
                  <X size={18} className="mr-1.5" />
                  Cancel
                </span>
              </button>
              <button
                onClick={confirmSubmission}
                className="flex-1 py-2 px-4 border border-transparent rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="flex items-center justify-center">
                  <Check size={18} className="mr-1.5" />
                  Confirm
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ExpensesPage;