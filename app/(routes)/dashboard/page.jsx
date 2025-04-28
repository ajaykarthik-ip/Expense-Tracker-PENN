"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import CardInfo from "../dashboard/_components/CardInfo";
import BarChartDashboard from "./_components/BarChartDashboard";
import { db } from "../../../utils/dbConfig";
import { Budgets, expenses, incomes, incomeEntries } from "../../../utils/schema";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import BudgetItem from "./budgets/_components/BudgetItem";
import ExpenseListTable from "./expenses/_components/ExpenseListTable";
import AddExpense from "./expenses/_components/AddExpense"; // Import the AddExpense component if needed

function Dashboard() {
  const [budgetList, setBudgetList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [savings, setSavings] = useState(0); // Added savings state
  const [incomeSource, setIncomeSource] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      getBudgetList();
      getIncomeData();
    }
  }, [user]);

  // Update savings whenever income or expenses change
  useEffect(() => {
    const calculatedSavings = totalIncome - totalExpenses;
    setSavings(calculatedSavings);
  }, [totalIncome, totalExpenses]);

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
    getAllExpenses();
  };

  const getAllExpenses = async () => {
    const result = await db
      .select({
        id: expenses.id,
        name: expenses.name,
        amount: expenses.amount,
        createdAt: expenses.createdAt,
      })
      .from(Budgets)
      .rightJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.createdBy, user?.primaryEmailAddress.emailAddress))
      .orderBy(desc(expenses.id));
    
    setExpensesList(result);
    
    // Calculate and update total expenses
    const total = result.reduce((total, expense) => total + Number(expense.amount), 0);
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
      
      // Get all entries for this income source
      const entries = await db.select()
        .from(incomeEntries)
        .where(
          eq(incomeEntries.incomeId, sourceId),
          eq(incomeEntries.createdBy, userEmail)
        )
        .orderBy(desc(incomeEntries.createdAt))
        .limit(5); // Get only the latest 5 entries for the dashboard
      
      setIncomeList(entries);
      
      // Calculate total from all income entries (not just the latest 5)
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

  // This section now uses state variables
  const refreshData = () => {
    getBudgetList();
    getIncomeData();
  };

  return (
    <div className="p-8">
      <h2 className="font-bold text-3xl">Hi, {user?.fullName} 👋</h2>
      <p className="text-gray-500">
        Here's what happening with your money, Let's manage your expense
      </p>

      <CardInfo budgetList={budgetList} />

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-500 mb-2">Total Income</h3>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-500 mb-2">Total Expenses</h3>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                <polyline points="17 18 23 18 23 12"></polyline>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-500 mb-2">Savings</h3>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${savings >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} mr-3`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(savings)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-6 gap-5">
        <div className="md:col-span-2">
          <BarChartDashboard budgetList={budgetList} />
          
          {/* Latest Expenses Section */}
          <h2 className="font-bold text-lg mt-5">Latest Expenses</h2>
          <ExpenseListTable
            expensesList={expensesList}
            refreshData={refreshData}
          />
          
          {/* Add Expense with income check
          {budgetList.length > 0 && (
            <div className="mt-5">
              <AddExpense 
                budgetId={budgetList[0].id} 
                user={user} 
                refreshData={refreshData}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
              />
            </div>
          )} */}
        </div>
        
        <div className="">
          {/* Latest Income Entries */}
          <h2 className="font-bold text-lg mb-4">Recent Income</h2>
          {incomeList.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="p-3 text-sm font-semibold text-gray-600 border-b">Description</th>
                      <th className="p-3 text-sm font-semibold text-gray-600 border-b">Category</th>
                      <th className="p-3 text-sm font-semibold text-gray-600 text-right border-b">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeList.map((income) => (
                      <tr 
                        key={income.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium text-gray-800 text-sm">{income.name}</div>
                          <div className="text-xs text-gray-500">{formatDate(income.createdAt)}</div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                            <span className="mr-1">{getCategoryIcon(income.category)}</span>
                            {income.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-800">
                          {formatCurrency(income.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t">
                <a href="/dashboard/income" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all income →
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl shadow-sm text-center mb-6">
              <div className="mb-3 text-3xl">💸</div>
              <p className="font-medium text-gray-600">No income entries yet</p>
              <p className="text-sm text-gray-500 mb-3">Track your earnings to see them here</p>
              <a href="/dashboard/income" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Add income →
              </a>
            </div>
          )}
          
          {/* Latest Budgets Section */}
          <h2 className="font-bold text-lg">Latest Budgets</h2>
          {budgetList.map((budget, index) => (
            <BudgetItem budget={budget} key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;