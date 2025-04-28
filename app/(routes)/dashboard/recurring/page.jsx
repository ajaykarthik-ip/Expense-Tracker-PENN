"use client";
import React, { useState } from 'react';

function RecurringTransactions() {
  // Sample hardcoded recurring expenses data
  const [recurringExpenses, setRecurringExpenses] = useState([
    {
      id: 1,
      name: "Rent",
      amount: 1200.00,
      category: "housing",
      frequency: "monthly",
      nextDate: "2025-05-01",
      isActive: true
    },
    {
      id: 2,
      name: "Internet Subscription",
      amount: 65.99,
      category: "utilities",
      frequency: "monthly",
      nextDate: "2025-04-15",
      isActive: true
    },
    {
      id: 3,
      name: "Gym Membership",
      amount: 49.99,
      category: "health",
      frequency: "monthly",
      nextDate: "2025-04-20",
      isActive: true
    },
    {
      id: 4,
      name: "Netflix Subscription",
      amount: 15.49,
      category: "entertainment",
      frequency: "monthly",
      nextDate: "2025-04-12",
      isActive: true
    },
    {
      id: 5,
      name: "Car Insurance",
      amount: 189.50,
      category: "insurance",
      frequency: "monthly",
      nextDate: "2025-04-28",
      isActive: true
    },
    {
      id: 6,
      name: "Phone Bill",
      amount: 85.00,
      category: "utilities",
      frequency: "monthly",
      nextDate: "2025-04-22",
      isActive: true
    }
  ]);

  // Format currency for display
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Format date for display
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }
  
  // Get category icon
  function getCategoryIcon(category) {
    const iconMap = {
      housing: "🏠",
      utilities: "💡",
      health: "⚕️",
      entertainment: "🎬",
      insurance: "🛡️",
      transportation: "🚗",
      food: "🍔",
      education: "📚",
      other: "📌"
    };
    
    return iconMap[category] || iconMap.other;
  }

  // Toggle active status
  function toggleActiveStatus(id) {
    setRecurringExpenses(prevExpenses => 
      prevExpenses.map(expense => 
        expense.id === id 
          ? { ...expense, isActive: !expense.isActive } 
          : expense
      )
    );
  }

  // Delete a recurring expense
  function deleteExpense(id) {
    setRecurringExpenses(prevExpenses => 
      prevExpenses.filter(expense => expense.id !== id)
    );
  }

  // Calculate total monthly expenses
  const totalMonthlyExpenses = recurringExpenses
    .filter(expense => expense.isActive && expense.frequency === "monthly")
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 bg-gray-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Fixed Monthly Expenses</h1>
                  <p className="text-gray-300 mt-1">Track your recurring bills and subscriptions</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-white">
                  <p className="text-sm font-medium text-gray-200">Total Monthly</p>
                  <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalMonthlyExpenses)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <span className="text-xl">🏠</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Housing</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    recurringExpenses
                      .filter(e => e.isActive && e.category === "housing")
                      .reduce((sum, e) => sum + e.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                <span className="text-xl">💡</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Utilities</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    recurringExpenses
                      .filter(e => e.isActive && e.category === "utilities")
                      .reduce((sum, e) => sum + e.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                <span className="text-xl">🎬</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Entertainment</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    recurringExpenses
                      .filter(e => e.isActive && e.category === "entertainment")
                      .reduce((sum, e) => sum + e.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <span className="text-xl">⚕️</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Health</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    recurringExpenses
                      .filter(e => e.isActive && e.category === "health")
                      .reduce((sum, e) => sum + e.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recurring Expenses Table */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="mr-2">📆</span>
              Fixed Monthly Expenses
            </h2>

          </div>
          
          {recurringExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-4 font-semibold text-gray-600 border-b">Description</th>
                    <th className="p-4 font-semibold text-gray-600 border-b">Category</th>
                    <th className="p-4 font-semibold text-gray-600 border-b">Due Date</th>
                    <th className="p-4 font-semibold text-gray-600 text-right border-b">Amount</th>
                    <th className="p-4 font-semibold text-gray-600 text-center border-b">Status</th>
                    <th className="p-4 font-semibold text-gray-600 text-center border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map((expense) => (
                    <tr 
                      key={expense.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!expense.isActive ? 'opacity-60' : ''}`}
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{expense.name}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                          <span className="mr-1">{getCategoryIcon(expense.category)}</span>
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{formatDate(expense.nextDate)}</td>
                      <td className="p-4 text-right font-semibold text-gray-800">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleActiveStatus(expense.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            expense.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {expense.isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => toggleActiveStatus(expense.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            title={expense.isActive ? "Pause" : "Activate"}
                          >
                            {expense.isActive ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 px-4 text-center border border-gray-100 rounded-lg">
              <div className="mb-4 text-4xl">📋</div>
              <p className="text-gray-600 font-medium mb-2">No recurring expenses yet</p>
              <p className="text-gray-500 text-sm">Add your first expense to start tracking.</p>
            </div>
          )}
        </div>

        {/* Upcoming Payments */}
        {/* <div className="mt-8 bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">⏰</span>
            Upcoming Payments
          </h2>
          
          <div className="space-y-4">
            {recurringExpenses
              .filter(expense => expense.isActive)
              .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
              .slice(0, 3)
              .map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-gray-100 mr-4">
                      <span className="text-xl">{getCategoryIcon(expense.category)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{expense.name}</p>
                      <p className="text-sm text-gray-500">Due {formatDate(expense.nextDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-gray-500">Monthly</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default RecurringTransactions;