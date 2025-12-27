// YNAB Import functionality
const YNAB_TOKEN_KEY = "ynab_access_token";
const YNAB_API_BASE = "https://api.ynab.com/v1";

let ynabBudgets = [];
let ynabCategories = [];
let ynabTransactions = [];
let ynabDetectedSubs = [];
let selectedBudgetId = null;

// Cache DOM elements
const ynabBackdrop = document.getElementById("ynab-import-backdrop");
const ynabPanel = document.getElementById("ynab-import-panel");
const ynabInner = ynabPanel ? ynabPanel.querySelector("div") : null;

/**
 * Open YNAB import modal
 */
function openYNABImport() {
  // Reset to step 1
  document.getElementById("ynab-step-1").classList.remove("hidden");
  document.getElementById("ynab-step-2").classList.add("hidden");
  document.getElementById("ynab-step-3").classList.add("hidden");

  // Check for saved token
  const savedToken = localStorage.getItem(YNAB_TOKEN_KEY);
  if (savedToken) {
    document.getElementById("ynab-token").value = savedToken;
    document.getElementById("ynab-save-token").checked = true;
  } else {
    document.getElementById("ynab-token").value = "";
    document.getElementById("ynab-save-token").checked = false;
  }

  // Reset state
  ynabBudgets = [];
  ynabCategories = [];
  ynabTransactions = [];
  ynabDetectedSubs = [];
  selectedBudgetId = null;

  // Show modal
  if (ynabBackdrop) ynabBackdrop.classList.remove("hidden");
  if (ynabPanel) ynabPanel.classList.remove("hidden");

  requestAnimationFrame(function() {
    if (ynabBackdrop) ynabBackdrop.classList.remove("opacity-0");
    if (ynabInner) {
      ynabInner.classList.remove("translate-y-full", "sm:scale-95", "opacity-0");
      ynabInner.classList.add("translate-y-0", "sm:translate-y-0", "sm:scale-100", "opacity-100");
    }
  });
}

/**
 * Close YNAB import modal
 */
function closeYNABImport() {
  if (ynabBackdrop) ynabBackdrop.classList.add("opacity-0");

  if (ynabInner) {
    ynabInner.classList.remove("translate-y-0", "sm:translate-y-0", "sm:scale-100", "opacity-100");
    ynabInner.classList.add("translate-y-full", "sm:scale-95", "opacity-0");
  }

  setTimeout(function() {
    if (ynabBackdrop) ynabBackdrop.classList.add("hidden");
    if (ynabPanel) ynabPanel.classList.add("hidden");
    
    // Reset to step 1
    document.getElementById("ynab-step-1").classList.remove("hidden");
    document.getElementById("ynab-step-2").classList.add("hidden");
    document.getElementById("ynab-step-3").classList.add("hidden");
  }, 300);
}

/**
 * Fetch budgets from YNAB API
 */
async function fetchYNABData() {
  const token = document.getElementById("ynab-token").value.trim();
  
  if (!token) {
    alert("Please enter your YNAB Personal Access Token");
    return;
  }

  // Save token if checkbox is checked
  if (document.getElementById("ynab-save-token").checked) {
    localStorage.setItem(YNAB_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(YNAB_TOKEN_KEY);
  }

  try {
    const response = await fetch(YNAB_API_BASE + "/budgets", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid token. Please check your YNAB Personal Access Token.");
      }
      throw new Error("Failed to fetch budgets from YNAB (HTTP " + response.status + ")");
    }

    const data = await response.json();
    ynabBudgets = data.data.budgets;

    if (ynabBudgets.length === 0) {
      alert("No budgets found in your YNAB account.");
      return;
    }

    // Move to step 2
    document.getElementById("ynab-step-1").classList.add("hidden");
    document.getElementById("ynab-step-2").classList.remove("hidden");

    renderBudgetsList();
  } catch (error) {
    alert("Error: " + error.message);
    console.error("YNAB API Error:", error);
  }
}

/**
 * Render list of budgets for user to select
 */
function renderBudgetsList() {
  const listEl = document.getElementById("ynab-budgets-list");
  
  let html = "";
  for (let i = 0; i < ynabBudgets.length; i++) {
    const budget = ynabBudgets[i];
    html += '<button onclick="selectBudget(\'' + budget.id + '\')" ';
    html += 'class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]">';
    html += '<div>';
    html += '<div class="font-semibold text-slate-900">' + budget.name + '</div>';
    html += '<div class="text-xs text-slate-500">Last modified: ' + new Date(budget.last_modified_on).toLocaleDateString() + '</div>';
    html += '</div>';
    html += '<span class="iconify h-5 w-5 text-slate-400" data-icon="ph:caret-right-bold"></span>';
    html += '</button>';
  }
  
  listEl.innerHTML = html;
}

/**
 * Select a budget and fetch its categories
 */
async function selectBudget(budgetId) {
  selectedBudgetId = budgetId;
  const token = document.getElementById("ynab-token").value.trim();

  try {
    const response = await fetch(YNAB_API_BASE + "/budgets/" + budgetId + "/categories", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch categories (HTTP " + response.status + ")");
    }

    const data = await response.json();
    const categoryGroups = data.data.category_groups;
    
    // Flatten categories from all groups
    ynabCategories = [];
    for (let i = 0; i < categoryGroups.length; i++) {
      const group = categoryGroups[i];
      if (group.categories && Array.isArray(group.categories)) {
        for (let j = 0; j < group.categories.length; j++) {
          const cat = group.categories[j];
          // Skip hidden and internal categories
          if (!cat.hidden && !cat.deleted) {
            ynabCategories.push({
              id: cat.id,
              name: cat.name,
              group_name: group.name
            });
          }
        }
      }
    }

    renderCategoriesList();
    document.getElementById("ynab-categories-section").classList.remove("hidden");
  } catch (error) {
    alert("Error fetching categories: " + error.message);
    console.error("YNAB API Error:", error);
  }
}

/**
 * Render categories list with checkboxes
 */
function renderCategoriesList() {
  const listEl = document.getElementById("ynab-categories-list");
  
  if (ynabCategories.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-slate-400">No categories found</p>';
    return;
  }

  let html = "";
  for (let i = 0; i < ynabCategories.length; i++) {
    const cat = ynabCategories[i];
    html += '<label class="flex cursor-pointer items-center gap-2 py-1.5">';
    html += '<input type="checkbox" class="ynab-category-checkbox h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" value="' + cat.id + '" />';
    html += '<span class="text-sm text-slate-700">' + cat.name + '</span>';
    html += '<span class="text-xs text-slate-400">(' + cat.group_name + ')</span>';
    html += '</label>';
  }
  
  listEl.innerHTML = html;
}

/**
 * Import subscriptions from YNAB transactions
 */
async function importYNABSubscriptions() {
  const token = document.getElementById("ynab-token").value.trim();
  
  if (!selectedBudgetId) {
    alert("Please select a budget first");
    return;
  }

  // Get selected category IDs
  const checkboxes = document.querySelectorAll(".ynab-category-checkbox:checked");
  const selectedCategoryIds = [];
  for (let i = 0; i < checkboxes.length; i++) {
    selectedCategoryIds.push(checkboxes[i].value);
  }

  try {
    // Fetch transactions from last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const sinceDate = twelveMonthsAgo.toISOString().split("T")[0];

    const response = await fetch(
      YNAB_API_BASE + "/budgets/" + selectedBudgetId + "/transactions?since_date=" + sinceDate,
      {
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch transactions (HTTP " + response.status + ")");
    }

    const data = await response.json();
    ynabTransactions = data.data.transactions;

    // Filter by selected categories if any
    if (selectedCategoryIds.length > 0) {
      ynabTransactions = ynabTransactions.filter(function(txn) {
        return selectedCategoryIds.indexOf(txn.category_id) >= 0;
      });
    }

    // Detect recurring patterns
    ynabDetectedSubs = detectRecurringYNAB(ynabTransactions);

    // Move to step 3
    document.getElementById("ynab-step-2").classList.add("hidden");
    document.getElementById("ynab-step-3").classList.remove("hidden");

    displayDetectedYNAB(ynabDetectedSubs);
  } catch (error) {
    alert("Error fetching transactions: " + error.message);
    console.error("YNAB API Error:", error);
  }
}

/**
 * Detect recurring transactions from YNAB data
 */
function detectRecurringYNAB(transactions) {
  // Only process outflows (negative amounts in YNAB)
  const outflows = transactions.filter(function(txn) {
    return txn.amount < 0 && txn.payee_name;
  });

  // Group by payee name
  const groups = {};
  for (let i = 0; i < outflows.length; i++) {
    const txn = outflows[i];
    const key = txn.payee_name.toUpperCase().trim();
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push({
      date: new Date(txn.date),
      amount: Math.abs(txn.amount / 1000), // Convert milliunits to dollars
      payee: txn.payee_name
    });
  }

  const recurring = [];
  const groupKeys = Object.keys(groups);

  for (let g = 0; g < groupKeys.length; g++) {
    const key = groupKeys[g];
    const group = groups[key];

    // Need at least 2 occurrences
    if (group.length < 2) continue;

    // Sort by date
    group.sort(function(a, b) { return a.date - b.date; });

    // Calculate average interval
    let totalDays = 0;
    for (let i = 1; i < group.length; i++) {
      const daysBetween = Math.round((group[i].date - group[i-1].date) / (1000 * 60 * 60 * 24));
      totalDays += daysBetween;
    }
    const avgDays = totalDays / (group.length - 1);

    // Determine cycle based on average days
    let cycle = null;
    if (avgDays >= 5 && avgDays <= 9) cycle = "Weekly";
    else if (avgDays >= 20 && avgDays <= 35) cycle = "Monthly";
    else if (avgDays >= 320 && avgDays <= 400) cycle = "Yearly";

    if (!cycle) continue;

    // Calculate average amount
    let totalAmount = 0;
    for (let i = 0; i < group.length; i++) {
      totalAmount += group[i].amount;
    }
    const avgAmount = totalAmount / group.length;

    // Check amount consistency (within 20%)
    let isConsistent = true;
    for (let i = 0; i < group.length; i++) {
      const variance = Math.abs(group[i].amount - avgAmount) / avgAmount;
      if (variance > 0.2) {
        isConsistent = false;
        break;
      }
    }
    
    if (!isConsistent) continue;

    recurring.push({
      name: group[0].payee,
      price: Math.round(avgAmount * 100) / 100,
      cycle: cycle,
      count: group.length,
      selected: true
    });
  }

  // Sort by count and then by price
  recurring.sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return b.price - a.price;
  });

  return recurring;
}

/**
 * Display detected subscriptions
 */
function displayDetectedYNAB(subscriptions) {
  const listEl = document.getElementById("ynab-detected-list");
  const noResultsEl = document.getElementById("ynab-no-detected");
  const addBtn = document.getElementById("ynab-add-btn");
  
  document.getElementById("ynab-detected-count").textContent = subscriptions.length;

  if (subscriptions.length === 0) {
    listEl.classList.add("hidden");
    noResultsEl.classList.remove("hidden");
    addBtn.classList.add("hidden");
    return;
  }

  listEl.classList.remove("hidden");
  noResultsEl.classList.add("hidden");
  addBtn.classList.remove("hidden");

  let html = "";
  for (let i = 0; i < subscriptions.length; i++) {
    const sub = subscriptions[i];
    const ringClass = sub.selected ? " ring-2 ring-indigo-500" : "";
    const checked = sub.selected ? " checked" : "";

    html += '<label class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 cursor-pointer hover:bg-slate-50 transition-colors' + ringClass + '">';
    html += '<input type="checkbox"' + checked + ' onchange="toggleYNABSub(' + i + ')" class="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">';
    html += '<div class="flex-1 min-w-0">';
    html += '<div class="font-semibold text-slate-900 text-sm truncate">' + sub.name + '</div>';
    html += '<div class="text-xs text-slate-500">' + sub.cycle + ' · Found ' + sub.count + 'x</div>';
    html += '</div>';
    html += '<div class="text-sm font-bold text-slate-900">$' + sub.price.toFixed(2) + '</div>';
    html += '</label>';
  }

  listEl.innerHTML = html;
  updateYNABAddButtonText();
}

/**
 * Toggle subscription selection
 */
function toggleYNABSub(idx) {
  ynabDetectedSubs[idx].selected = !ynabDetectedSubs[idx].selected;
  displayDetectedYNAB(ynabDetectedSubs);
}

/**
 * Update the "Add Selected" button text
 */
function updateYNABAddButtonText() {
  let selectedCount = 0;
  for (let i = 0; i < ynabDetectedSubs.length; i++) {
    if (ynabDetectedSubs[i].selected) selectedCount++;
  }

  const btn = document.getElementById("ynab-add-btn");

  if (selectedCount > 0) {
    const plural = selectedCount > 1 ? "s" : "";
    btn.textContent = "Add " + selectedCount + " Subscription" + plural;
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    btn.textContent = "Add Selected";
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

/**
 * Add selected subscriptions to SubGrid
 */
function addYNABSubscriptions() {
  const toAdd = ynabDetectedSubs.filter(function(s) { return s.selected; });
  if (toAdd.length === 0) return;

  for (let i = 0; i < toAdd.length; i++) {
    const sub = toAdd[i];
    subs.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: sub.name,
      price: sub.price,
      currency: selectedCurrency,
      cycle: sub.cycle,
      url: "",
      color: randColor().id
    });
  }

  save();
  closeYNABImport();

  const plural = toAdd.length > 1 ? "s" : "";
  alert("Added " + toAdd.length + " subscription" + plural + " from YNAB!");
}



// Add backdrop click handler when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  const ynabBackdrop = document.getElementById("ynab-import-backdrop");
  const ynabPanel = document.getElementById("ynab-import-panel");
  const ynabInner = ynabPanel ? ynabPanel.querySelector("div") : null;

  if (ynabBackdrop) ynabBackdrop.addEventListener("click", closeYNABImport);
  if (ynabPanel) {
    ynabPanel.addEventListener("click", closeYNABImport);
    if (ynabInner) ynabInner.addEventListener("click", function(e) { e.stopPropagation(); });
  }
});
