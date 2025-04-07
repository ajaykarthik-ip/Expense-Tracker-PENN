import React, { useState } from "react";
import moment from "moment";
import { db } from "../../../../../utils/dbConfig";
import { Budgets, expenses } from "../../../../../utils/schema";
import { Input } from "../../../../../components/ui/input";
import { toast } from "sonner";
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

function AddExpense({ budgetId, user, refreshData, totalIncome, totalExpenses }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  // Format currency for better display in alerts
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleExpenseSubmit = async () => {
    // Convert amount to number for calculation
    const expenseAmount = Number(amount);
    
    // Check if this expense would exceed income
    if (totalExpenses + expenseAmount > totalIncome) {
      setIsAlertOpen(true);
      return;
    }
    
    // If expense doesn't exceed income, add it directly
    await addNewExpense();
  };

  const addNewExpense = async () => {
    const result = await db
      .insert(expenses)
      .values({
        name: name,
        amount: amount,
        budgetId: budgetId,
        createdAt: moment().format("DD/MM/YYYY"),
      })
      .returning({ insertedId: Budgets.id });

    console.log(result);
    if (result) {
      refreshData();
      toast("New Expense Added");
      setName(""); // Reset name to empty string
      setAmount(""); // Reset amount to empty string
    }
  };

  const confirmExpenseAddition = async () => {
    await addNewExpense();
    setIsAlertOpen(false);
  };

  return (
    <div className="border p-5 rounded-lg">
      <h2 className="font-bold text-lg">Add Expense</h2>
      <div className="mt-2">
        <h2 className="text-black font-medium my-1">Expense Name</h2>
        <Input
          value={name}
          placeholder="e.g. Groceries"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <h2 className="text-black font-medium my-1">Expense Amount</h2>
        <Input
          value={amount}
          type="number"
          placeholder="e.g. 1000"
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button
        disabled={!(name && amount)}
        onClick={() => handleExpenseSubmit()}
        className="mt-3 w-full"
      >
        Add New Expense
      </Button>

      {/* Alert Dialog for over-budget warning */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expense Exceeds Income</AlertDialogTitle>
            <AlertDialogDescription>
              <p>This expense of {formatCurrency(Number(amount))} will exceed your total income.</p>
              <p className="mt-2">
                Current Income: {formatCurrency(totalIncome)}<br />
                Current Expenses: {formatCurrency(totalExpenses)}<br />
                New Total Expenses: {formatCurrency(totalExpenses + Number(amount))}
              </p>
              <p className="mt-2">Do you still want to add this expense?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExpenseAddition} className="bg-red-600 hover:bg-red-700">
              Add Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AddExpense;