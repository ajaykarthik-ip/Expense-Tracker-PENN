"use client";
import React, { useState } from "react";
import { db } from "../../../../../utils/dbConfig";
import { Budgets } from "../../../../../utils/schema";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Input } from "../../../../../components/ui/input";
import { Button } from "../../../../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../../components/ui/alert-dialog";

function CreateBudget({ refreshData, totalIncome, totalExpenses }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { user } = useUser();

  // Format currency for better display in alerts
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleBudgetSubmit = () => {
    // Convert amount to number for calculation
    const budgetAmount = Number(amount);
    
    // Check if this budget would exceed income
    if (totalExpenses + budgetAmount > totalIncome) {
      setIsAlertOpen(true);
      return;
    }
    
    // If budget doesn't exceed income, create it directly
    createBudget();
  };

  const createBudget = async () => {
    if (!name || !amount) return;

    try {
      await db.insert(Budgets).values({
        name: name,
        amount: amount,
        createdBy: user?.primaryEmailAddress?.emailAddress,
      });

      toast.success("New Budget Created!");
      refreshData();
      
      // Reset form fields
      setName("");
      setAmount("");
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
    }
  };

  const confirmBudgetCreation = async () => {
    await createBudget();
    setIsAlertOpen(false);
  };

  return (
    <div className="p-5 border rounded-lg bg-white shadow-sm">
      <h2 className="font-bold text-lg mb-3">Create New Budget</h2>
      <div className="space-y-3">
        <div>
          <h2 className="text-black font-medium mb-1">Budget Name</h2>
          <Input
            value={name}
            placeholder="e.g. Groceries"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <h2 className="text-black font-medium mb-1">Budget Amount</h2>
          <Input
            value={amount}
            type="number"
            placeholder="e.g. 500"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          disabled={!(name && amount)}
          onClick={handleBudgetSubmit}
          className="w-full"
        >
          Create Budget
        </Button>
      </div>

      {/* Alert Dialog for over-budget warning */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Budget Exceeds Income</AlertDialogTitle>
            <AlertDialogDescription>
              <p>This budget of {formatCurrency(Number(amount))} will cause your total planned expenses to exceed your total income.</p>
              <p className="mt-2">
                Current Income: {formatCurrency(totalIncome)}<br />
                Current Expenses: {formatCurrency(totalExpenses)}<br />
                New Total Expenses: {formatCurrency(totalExpenses + Number(amount))}
              </p>
              <p className="mt-2">Do you still want to create this budget?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBudgetCreation} className="bg-red-600 hover:bg-red-700">
              Create Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CreateBudget;