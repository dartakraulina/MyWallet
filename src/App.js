import { useEffect, useState } from "react";
import "./App.css";
import initialCategories from "./data/categories.json";

const STORAGE_KEY = "my-wallet-data";
const MAX_TRANSACTIONS = 30;

function emptyWallet() {
  return {
    categories: structuredClone(initialCategories),
    transactions: [],
  };
}

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
      return null;
    }
    return {
      categories: parsed.categories,
      transactions: parsed.transactions.slice(0, MAX_TRANSACTIONS),
    };
  } catch {
    return null;
  }
}

function getInitialState() {
  const saved = loadSavedData();
  if (saved) return saved;

  return emptyWallet();
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save wallet data:", error);
  }
}

export default function App() {

  const [wallet, setWallet] = useState(getInitialState);
  const { categories, transactions } = wallet;

  const walletTotal = Number(
    categories.reduce((sum, category) => sum + Number(category.balance), 0).toFixed(2)
  );

  useEffect(() => {
    saveData(wallet);
  }, [wallet]);

  function handleAddDeposit(amount) {
    setWallet((prev) => ({
      ...prev,
      categories: prev.categories.map((category) => {
        const percent = parseFloat(category.percentage);
        const share = Number((amount * (percent / 100)).toFixed(2));
        return {
          ...category,
          balance: Number((category.balance + share).toFixed(2)),
        };
      }),
    }));
  }

  function handleAddExpense(newExpense) {
    setWallet((prev) => ({
      categories: prev.categories.map((category) => {
        if (category.title !== newExpense.category) {
          return category;
        }

        return {
          ...category,
          spent: Number((category.spent + newExpense.amount).toFixed(2)),
          balance: Number((category.balance - newExpense.amount).toFixed(2)),
        };
      }),
      transactions: [newExpense, ...prev.transactions].slice(0, MAX_TRANSACTIONS),
    }));
  }

  function handleResetWallet() {
    const confirmed = window.confirm(
      "Reset wallet to zero? This clears all balances, spending, and transactions."
    );
    if (!confirmed) return;
    setWallet(emptyWallet());
  }

  function handleDeleteExpense(id) {
    setWallet((prev) => {
      const expenseToDelete = prev.transactions.find((item) => item.id === id);
      if (!expenseToDelete) return prev;

      return {
        categories: prev.categories.map((category) => {
          if (category.title !== expenseToDelete.category) {
            return category;
          }
          return {
            ...category,
            spent: Number((category.spent - expenseToDelete.amount).toFixed(2)),
            balance: Number((category.balance + expenseToDelete.amount).toFixed(2)),
          };
        }),
        transactions: prev.transactions.filter((item) => item.id !== id),
      };
    });
  }

  return (
    <div className="app">
      <Header onReset={handleResetWallet} />
      <SalarySection walletTotal={walletTotal} onDeposit={handleAddDeposit} />
      <CategoryGrid categories={categories} />
      <ExpenseForm categories={categories} onAddExpense={handleAddExpense} />
      <TransactionList
        transactions={transactions}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
}

function Header({ onReset }) {
  return (
    <header className="header">
      <h1>My wallet </h1>
      <button type="button" className="button-reset" onClick={onReset}>
        Reset wallet
      </button>
    </header>
  );
}

function SalarySection({ walletTotal, onDeposit }) {
  const [salary, setSalary] = useState("");

  function handleDeposit() {
    const amount = parseFloat(salary);

    if (isNaN(amount) || amount <= 0) return;

    onDeposit(amount);

    setSalary("");
  }

  return (
    <section className="card salary-card">
      <div className="salary-info">
        <h3>Monthly Deposit</h3>
        <p className="salary-subtitle">
          Total money in the wallet: €{walletTotal}
        </p>
      </div>
      <div className="salary-controls">
        <input
          type="number"
          placeholder="0"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <button className="button button-salary " onClick={handleDeposit}>
          Deposit
        </button>
      </div>
    </section>
  );
}

function CategoryGrid({ categories }) {
  return (
    <section>
      <div className="category-grid">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            title={category.title}
            percentage={category.percentage}
            description={category.description}
            savings={category.balance}
            moneySpent={category.spent}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ title, percentage, description, savings, moneySpent }) {
  return (
    <div className="category-card">
      <div className="category-header">
        <span>{title}</span>
        <span className="category-badge">{percentage}</span>
      </div>
      <p className="category-description">{description}</p>
      <div className="balance">€{savings}</div>
      <div className="spent">€{moneySpent} spent</div>
    </div>
  );
}

function ExpenseForm({ categories, onAddExpense }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!title || !amount || !category) return;
    if (Number(amount) <= 0) return;

    const newExpense = {
      id: crypto.randomUUID(),
      title,
      amount: Number(amount),
      category,
    };

    onAddExpense(newExpense);

    setTitle("");
    setAmount("");
    setCategory("");
  }

  return (
    <section className="card">
      <h3>Add Expense</h3>
      <form className="form-add-expense" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Expense"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.title}>
              {item.title}
            </option>
          ))}
        </select>
        <button className="button">Log expense</button>
      </form>
    </section>
  );
}

function TransactionList({ transactions, onDelete }) {
  return (
    <section className="card">
      <h3>Added transactions</h3>
      {transactions.length >= MAX_TRANSACTIONS && (
        <p className="transaction-hint">
          Showing the last {MAX_TRANSACTIONS} expenses. Older ones are dropped; category balances stay.
        </p>
      )}
      {transactions.length === 0 ? (
        <p className="empty-message">No transactions logged yet.</p>
      ) : (
        <ul className="transaction-list">
          {transactions.map((item) => (
            <TransactionItem
              key={item.id}
              title={item.title}
              category={item.category}
              amount={item.amount}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TransactionItem({ title, category, amount, onDelete }) {
  return (
    <li className="transaction-item">
      <div className="transaction-info">
        <strong>{title}</strong>
        <span className="transaction-tag">{category}</span>
      </div>
      <div className="transaction-actions">
        <span className="transaction-amount">-€{amount}</span>
        <button className="button-delete" onClick={onDelete}>
          🗑
        </button>
      </div>
    </li>
  );
}
