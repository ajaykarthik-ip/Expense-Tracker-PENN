"use client";
import React, { useState } from "react";
import { db } from "../../../../../utils/dbConfig";
import { expenses } from "../../../../../utils/schema";
import { eq } from "drizzle-orm";
import { Trash2, Calendar, DollarSign, Tag, ArrowUpDown, X, AlertCircle } from "lucide-react";

function ExpenseListTable({ expensesList, refreshData }) {
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get relative or formatted date
  const getFormattedDate = (dateString) => {
    // Handle various date formats
    let date;
    
    if (typeof dateString === 'string') {
      // Check if it's already a simple YYYY-MM-DD
      if (dateString.length === 10 && dateString.includes('-')) {
        // Convert YYYY-MM-DD to Date object
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        // Try to parse any other string format
        date = new Date(dateString);
      }
    } else {
      // Handle if it's already a Date object
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { full: "Invalid date", relative: "Unknown" };
    }
    
    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const fullDate = `${day}/${month}/${year}`;
    
    // Calculate relative time for display
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let relativeDate;
    
    if (diffDays === 0) {
      relativeDate = "Today";
    } else if (diffDays === 1) {
      relativeDate = "Yesterday";
    } else if (diffDays < 7) {
      relativeDate = `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      relativeDate = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      relativeDate = fullDate;
    }
    
    return { full: fullDate, relative: relativeDate };
  };

  // Delete expense
  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await db.delete(expenses).where(eq(expenses.id, id));
      setDeleteConfirm(null);
      refreshData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle sort field and direction
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort expenses based on current sort settings
  const sortedExpenses = [...expensesList].sort((a, b) => {
    let compareA, compareB;
    
    // Handle different field types
    if (sortField === "amount") {
      compareA = parseFloat(a.amount);
      compareB = parseFloat(b.amount);
    } else if (sortField === "createdAt") {
      compareA = new Date(a.createdAt).getTime();
      compareB = new Date(b.createdAt).getTime();
    } else {
      compareA = a[sortField]?.toString().toLowerCase() || "";
      compareB = b[sortField]?.toString().toLowerCase() || "";
    }
    
    // Apply sort direction
    if (sortDirection === "asc") {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  // Get amount class based on value
  const getAmountClass = (amount) => {
    const value = parseFloat(amount);
    if (value >= 1000) return "text-red-600 font-medium";
    if (value >= 500) return "text-amber-600 font-medium";
    if (value >= 100) return "text-blue-600";
    return "text-gray-600";
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-blue-600">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!deleteConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
          <div className="flex items-start mb-4">
            <div className="mr-3 text-amber-500 flex-shrink-0 mt-0.5">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
              <p className="text-gray-600 mt-1">
                Are you sure you want to delete this expense? This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500">Expense:</span>
              <span className="font-medium text-gray-800">{deleteConfirm.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Amount:</span>
              <span className={getAmountClass(deleteConfirm.amount)}>
                {formatCurrency(deleteConfirm.amount)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center"
              disabled={isDeleting}
            >
              <X size={16} className="mr-1.5" />
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-1.5" />
                  Delete Expense
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div className="py-10 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
        <DollarSign size={24} />
      </div>
      <h3 className="text-lg font-medium text-gray-800 mb-1">No expenses found</h3>
      <p className="text-gray-500">There are no expenses to display</p>
    </div>
  );

  return (
    <>
      {expensesList.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    <Tag size={14} className="mr-1.5 text-gray-400" />
                    Name
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1.5 text-gray-400" />
                    Amount
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden sm:table-cell"
                  onClick={() => handleSort("budgetName")}
                >
                  <div className="flex items-center">
                    <Tag size={14} className="mr-1.5 text-gray-400" />
                    Budget
                    {renderSortIndicator("budgetName")}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1.5 text-gray-400" />
                    Date
                    {renderSortIndicator("createdAt")}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedExpenses.map((expense) => {
                const date = getFormattedDate(expense.createdAt);
                return (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{expense.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${getAmountClass(expense.amount)}`}>
                        {formatCurrency(expense.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                        {expense.budgetName || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <span className="sm:hidden">{date.relative}</span>
                        <span className="hidden sm:inline" title={date.full}>{date.relative}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setDeleteConfirm(expense)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                        title="Delete expense"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
      
      <DeleteConfirmationModal />
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default ExpenseListTable;