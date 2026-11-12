const market = [
  { symbol: "ACME", name: "Acme Robotics", price: 42.5, change: 1.8 },
  { symbol: "BLU", name: "Blue River Energy", price: 18.2, change: -0.6 },
  { symbol: "NOVA", name: "Nova Health", price: 76.4, change: 2.1 },
  { symbol: "PINE", name: "Pinecone Cloud", price: 31.75, change: 0.4 },
];

const account = {
  cash: 10000,
  positions: {
    ACME: { shares: 12, averageCost: 38.25 },
    NOVA: { shares: 4, averageCost: 81.1 },
  },
  activity: [],
};

const money = (amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
const quoteFor = (symbol) => market.find((asset) => asset.symbol === symbol);

function render() {
  document.querySelector("#cash-balance").textContent = money(account.cash);

  const positionValue = Object.entries(account.positions).reduce((total, [symbol, position]) => {
    const quote = quoteFor(symbol);
    return total + (quote ? quote.price * position.shares : 0);
  }, 0);
  document.querySelector("#portfolio-value").textContent = money(account.cash + positionValue);

  const dailyChange = Object.entries(account.positions).reduce((total, [symbol, position]) => {
    const quote = quoteFor(symbol);
    return total + (quote ? quote.price * position.shares * quote.change / 100 : 0);
  }, 0);
  const dailyNode = document.querySelector("#daily-change");
  dailyNode.textContent = `${dailyChange >= 0 ? "+" : ""}${money(dailyChange)}`;
  dailyNode.className = `big-number ${dailyChange >= 0 ? "positive" : "negative"}`;

  const rows = Object.entries(account.positions)
    .filter(([, position]) => position.shares !== 0)
    .map(([symbol, position]) => {
      const quote = quoteFor(symbol);
      if (!quote) return "";
      const value = quote.price * position.shares;
      const returnPct = ((quote.price - position.averageCost) / position.averageCost) * 100;
      return `<tr>
        <td><strong>${symbol}</strong><span class="asset-name">${quote.name}</span></td>
        <td>${position.shares.toFixed(3)}</td>
        <td>${money(quote.price)}</td>
        <td>${money(value)}</td>
        <td class="${returnPct >= 0 ? "positive" : "negative"}">${returnPct.toFixed(2)}%</td>
      </tr>`;
    });
  document.querySelector("#holdings-body").innerHTML = rows.join("") || '<tr><td colspan="5" class="muted">No holdings yet.</td></tr>';

  document.querySelector("#activity-list").innerHTML = account.activity.length
    ? account.activity.map((item) => `<li><span class="activity-dot ${item.side}"></span><span><strong>${item.side.toUpperCase()} ${item.quantity} ${item.symbol}</strong><small>${item.time}</small></span><strong>${money(item.total)}</strong></li>`).join("")
    : '<li class="muted">No simulated orders yet.</li>';
}

function updateEstimate() {
  const symbol = document.querySelector("#symbol").value;
  const side = document.querySelector("#side").value;
  const quantity = Number(document.querySelector("#quantity").value);
  const quote = quoteFor(symbol);
  const total = quote ? quantity * quote.price : 0;
  document.querySelector("#order-estimate").textContent = `Estimated ${side === "buy" ? "cost" : "proceeds"}: ${money(total)}`;
}

const symbolSelect = document.querySelector("#symbol");
for (const asset of market) {
  const option = document.createElement("option");
  option.value = asset.symbol;
  option.textContent = `${asset.symbol} — ${asset.name}`;
  symbolSelect.append(option);
}

["#symbol", "#side", "#quantity"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", updateEstimate);
});

document.querySelector("#order-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const symbol = symbolSelect.value;
  const side = document.querySelector("#side").value;
  const quantity = Number(document.querySelector("#quantity").value);
  const quote = quoteFor(symbol);
  const total = quote.price * quantity;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    document.querySelector("#order-message").textContent = "Enter a positive share amount.";
    return;
  }

  if (side === "buy") {
    if (total > account.cash) {
      document.querySelector("#order-message").textContent = "Not enough cash to complete this purchase.";
      return;
    }
    account.cash -= total;
    account.positions[symbol] ??= { shares: 0, averageCost: quote.price };
    const position = account.positions[symbol];
    position.averageCost = ((position.averageCost * position.shares) + total) / (position.shares + quantity);
    position.shares += quantity;
  } else {
    const position = account.positions[symbol];
    if (!position || position.shares < quantity) {
      document.querySelector("#order-message").textContent = "Not enough shares to complete this sale.";
      return;
    }
    position.shares -= quantity;
    account.cash += total;
  }

  account.activity.unshift({
    symbol,
    side,
    quantity,
    total,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  document.querySelector("#order-message").textContent = `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol} in the demo account.`;
  render();
  updateEstimate();
});

render();
updateEstimate();
