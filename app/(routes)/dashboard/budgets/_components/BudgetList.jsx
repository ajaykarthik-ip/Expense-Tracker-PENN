"use client";
import React, { useEffect, useState } from "react";
import CreateBudget from "./CreateBudget";
import BudgetItem from "./BudgetItem";
import { eq, getTableColumns, sql, desc } from "drizzle-orm";
import { useUser } from "@clerk/nextjs";
import { Budgets, expenses, incomes, incomeEntries } from "../../../../../utils/schema";
import { db } from "../../../../../utils/dbConfig";

function BudgetList() {
  const [budgetList, setBudgetList] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [savings, setSavings] = useState(0);
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

  // Function to refresh all data
  const refreshData = async () => {
    await getBudgetList();
    await getIncomeData();
  };

  return (
    <div className="mt-7">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <CreateBudget 
          refreshData={refreshData} 
          totalIncome={totalIncome} 
          totalExpenses={totalExpenses}
        />
        {budgetList?.length > 0
          ? budgetList.map((budget, index) => <BudgetItem budget={budget} key={index} />)
          : [1, 2, 3, 4, 5].map((item, index) => (
              <div
                key={index}
                className="w-full bg-slate-200 rounded-lg h-[150px] animate-pulse"
              ></div>
            ))}
      </div>
    </div>
  );
}

export default BudgetList;