"use client";
import React, { useEffect, useState } from "react";
import { db } from "../../../../utils/dbConfig";
import { incomes, incomeEntries } from "../../../../utils/schema";
import { eq, desc } from "drizzle-orm";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

function IncomeTracker() {
  const { user, isLoaded } = useUser();
  const [incomeList, setIncomeList] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [incomeSource, setIncomeSource] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "salary",
    createdAt: new Date().toISOString().split('T')[0]
  });

  // Load data when component mounts or user changes
  useEffect(() => {
    if (isLoaded && user) {
      checkOrCreateIncomeSource();
    } else if (isLoaded && !user) {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  // Check if user has an income source, or create one
  async function checkOrCreateIncomeSource() {
    try {
      if (!user?.primaryEmailAddress?.emailAddress) {
        setIsLoading(false);
        return;
      }
      
      const userEmail = user.primaryEmailAddress.emailAddress;
      
      // Check if user already has an income source
      const existingSources = await db.select()
        .from(incomes)
        .where(eq(incomes.createdBy, userEmail));
      
      if (existingSources.length > 0) {
        // User already has an income source
        setIncomeSource(existingSources[0]);
        loadIncomeEntries(existingSources[0].id);
      } else {
        // Create a default income source for the user
        const newSource = await db.insert(incomes).values({
          name: "My Income",
          amount: "0",
          icon: "💰",
          createdBy: userEmail
        }).returning();
        
        if (newSource.length > 0) {
          setIncomeSource(newSource[0]);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error checking/creating income source:", error);
      toast.error("Failed to setup income tracker");
      setIsLoading(false);
    }
  }

  // Load income entries for the selected source
  async function loadIncomeEntries(sourceId) {
    try {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      const userEmail = user.primaryEmailAddress.emailAddress;
      
      // Get all entries for this income source
      const entries = await db.select()
        .from(incomeEntries)
        .where(
          eq(incomeEntries.incomeId, sourceId),
          eq(incomeEntries.createdBy, userEmail)
        )
        .orderBy(desc(incomeEntries.createdAt));
      
      setIncomeList(entries);
      
      // Calculate total
      const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      setTotalIncome(total);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading income entries:", error);
      toast.error("Failed to load your income data");
      setIsLoading(false);
    }
  }

  // Add a new income entry
  async function addIncomeEntry(e) {
    e.preventDefault();
    
    try {
      if (!formData.name || !formData.amount) {
        toast.error("Please fill in all required fields");
        return;
      }
      
      if (!incomeSource) {
        toast.error("No income source available");
        return;
      }
      
      if (!user?.primaryEmailAddress?.emailAddress) {
        toast.error("You need to be logged in");
        return;
      }
      
      const userEmail = user.primaryEmailAddress.emailAddress;
      
      // Add the new entry
      const result = await db.insert(incomeEntries).values({
        name: formData.name,
        amount: parseFloat(formData.amount),
        incomeId: incomeSource.id,
        createdAt: formData.createdAt,
        createdBy: userEmail,
        category: formData.category
      }).returning();
      
      if (result.length > 0) {
        toast.success("Income added successfully!");
        
        // Clear the form
        setFormData({
          name: "",
          amount: "",
          category: "salary",
          createdAt: new Date().toISOString().split('T')[0]
        });
        
        // Reload the entries
        loadIncomeEntries(incomeSource.id);
      }
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income");
    }
  }

  // Delete an income entry
  async function deleteIncomeEntry(id) {
    try {
      if (!user?.primaryEmailAddress?.emailAddress) return;
      
      // Delete the entry
      const result = await db.delete(incomeEntries)
        .where(eq(incomeEntries.id, id))
        .returning();
      
      if (result.length > 0) {
        toast.success("Income deleted");
        loadIncomeEntries(incomeSource.id);
      }
    } catch (error) {
      console.error("Error deleting income:", error);
      toast.error("Failed to delete income");
    }
  }

  // Handle form input changes
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  }

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
      salary: "💼",
      freelance: "🚀",
      investment: "📈",
      gift: "🎁",
      other: "✨"
    };
    
    return iconMap[category] || iconMap.other;
  }

  // Show loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800"></div>
          <p className="text-gray-600 font-medium">Loading your finances...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Track Your Income</h2>
            <p className="text-gray-600 mb-6">Please sign in to manage and track your income.</p>
          </div>
          <button 
            onClick={() => window.location.href = "/sign-in"}
            className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg font-medium shadow-sm hover:bg-gray-900 transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 bg-gray-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Income </h1>
                  <p className="text-gray-300 mt-1">Track and manage your earnings</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-white">
                  <p className="text-sm font-medium text-gray-200">Total Income</p>
                  <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Income Entry Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 h-full">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">💸</span>
                Add New Income
              </h2>
              
              <form onSubmit={addIncomeEntry} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                    placeholder="Monthly salary, bonus, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      min="0.01"
                      step="0.01"
                      className="w-full p-3 pl-8 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date*</label>
                  <input
                    type="date"
                    name="createdAt"
                    value={formData.createdAt}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  >
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance</option>
                    <option value="investment">Investment</option>
                    <option value="gift">Gift</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg font-medium shadow-sm hover:bg-gray-900 transition-all"
                >
                  Add Income
                </button>
              </form>
            </div>
          </div>
          
          {/* Income List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">📊</span>
                Income History
              </h2>
              
              {incomeList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-4 font-semibold text-gray-600 border-b">Description</th>
                        <th className="p-4 font-semibold text-gray-600 border-b">Date</th>
                        <th className="p-4 font-semibold text-gray-600 border-b">Category</th>
                        <th className="p-4 font-semibold text-gray-600 text-right border-b">Amount</th>
                        <th className="p-4 font-semibold text-gray-600 text-center border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeList.map((income) => (
                        <tr 
                          key={income.id} 
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-medium text-gray-800">{income.name}</div>
                          </td>
                          <td className="p-4 text-gray-600">{formatDate(income.createdAt)}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                              <span className="mr-1">{getCategoryIcon(income.category)}</span>
                              {income.category}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold text-gray-800">
                            {formatCurrency(income.amount)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => deleteIncomeEntry(income.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 px-4 text-center border border-gray-100 rounded-lg">
                  <div className="mb-4 text-4xl">💼</div>
                  <p className="text-gray-600 font-medium mb-2">No income entries yet</p>
                  <p className="text-gray-500 text-sm">Add your first income using the form.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomeTracker;