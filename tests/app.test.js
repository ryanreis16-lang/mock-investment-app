const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function createApp() {
  const elements = new Map();
  const handlers = new Map();
  const makeElement = () => ({
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    options: [],
    append(option) {
      this.options.push(option);
      if (!this.value) this.value = option.value;
    },
    addEventListener(event, callback) {
      handlers.set(`${this.id}:${event}`, callback);
    },
  });
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) {
        const element = makeElement();
        element.id = selector;
        elements.set(selector, element);
      }
      return elements.get(selector);
    },
    createElement() {
      return makeElement();
    },
  };

  document.querySelector("#quantity").value = "1";
  document.querySelector("#side").value = "buy";
  const context = vm.createContext({ document, Intl, Number, Object, Date });
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  vm.runInContext(appSource, context);

  return {
    account: (expression) => vm.runInContext(expression, context),
    element: (selector) => document.querySelector(selector),
    submit() {
      handlers.get("#order-form:submit")({ preventDefault() {} });
    },
  };
}

test("rejects zero, negative, and non-finite quantities without changing the account", () => {
  for (const quantity of ["0", "-1", "Infinity"]) {
    const app = createApp();
    app.element("#quantity").value = quantity;
    app.submit();

    assert.equal(app.account("account.cash"), 10000);
    assert.equal(app.account("account.positions.ACME.shares"), 12);
    assert.equal(app.account("account.activity.length"), 0);
    assert.match(app.element("#order-message").textContent, /positive share amount/);
  }
});

test("rejects buy orders above available cash without changing the account", () => {
  const app = createApp();
  app.element("#quantity").value = "1000";
  app.submit();

  assert.equal(app.account("account.cash"), 10000);
  assert.equal(app.account("account.positions.ACME.shares"), 12);
  assert.equal(app.account("account.activity.length"), 0);
  assert.match(app.element("#order-message").textContent, /Not enough cash/);
});

test("calculates holding returns relative to average purchase cost", () => {
  const app = createApp();
  const holdings = app.element("#holdings-body").innerHTML;

  assert.match(holdings, /11\.11%/);
  assert.match(holdings, /-5\.80%/);
});
