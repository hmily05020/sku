const GENERAL_PRODUCT = "通用";

const state = {
  data: null,
  bundledState: null,
  skus: [],
  costs: [],
  componentRows: [],
  editingSkuId: null,
};

const els = {};
const formatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });

init();

async function init() {
  cacheElements();
  const res = await fetch("./src/data.json");
  state.data = await res.json();
  state.bundledState = await loadBundledState();
  state.skus = loadSkus();
  state.costs = loadCostRows();
  bindEvents();
  setDefaults();
  renderAll();
}

function cacheElements() {
  for (const id of [
    "dataTime",
    "departmentFilter",
    "productFilter",
    "overviewChannel",
    "searchInput",
    "addSkuBtn",
    "overviewRefundRate",
    "overviewRefundCorrectionRate",
    "overviewShareRate",
    "overviewPlatformRate",
    "overviewLaborRate",
    "overviewShippingCost",
    "overviewFreightInsurance",
    "overviewInfluencerRate",
    "overviewLeaderRate",
    "skuTableBody",
    "metricSkuCount",
    "metricCalculatedCount",
    "metricMissingCount",
    "metricAvgRoi",
    "scenarioSelect",
    "calcProduct",
    "calcSpec",
    "calcChannel",
    "calcPrice",
    "refundRate",
    "refundCorrectionRate",
    "shippingCost",
    "freightInsurance",
    "influencerRate",
    "leaderRate",
    "platformRate",
    "shareRate",
    "laborRate",
    "componentList",
    "parseSpecBtn",
    "addLineBtn",
    "roiNetResult",
    "roiRefundResult",
    "marginResult",
    "profitResult",
    "productCostResult",
    "deliveryCostResult",
    "oldPrice",
    "newPrice",
    "compareOutput",
    "resetCostsBtn",
    "exportConfigBtn",
    "importConfigInput",
    "newCostProduct",
    "newCostName",
    "newCostValue",
    "addCostBtn",
    "costTableBody",
    "productList",
    "skuDialog",
    "skuDialogTitle",
    "editDepartment",
    "editProduct",
    "editSku",
    "editPrice",
    "editRefundRate",
    "cancelSkuEditBtn",
    "saveSkuBtn",
  ]) {
    els[id] = document.getElementById(id);
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  for (const el of [
    els.departmentFilter,
    els.productFilter,
    els.overviewChannel,
    els.searchInput,
    els.overviewRefundRate,
    els.overviewRefundCorrectionRate,
    els.overviewShareRate,
    els.overviewPlatformRate,
    els.overviewLaborRate,
    els.overviewShippingCost,
    els.overviewFreightInsurance,
    els.overviewInfluencerRate,
    els.overviewLeaderRate,
  ]) {
    el.addEventListener("input", renderOverview);
    el.addEventListener("change", renderOverview);
  }

  els.addSkuBtn.addEventListener("click", () => openSkuDialog());
  els.cancelSkuEditBtn.addEventListener("click", () => els.skuDialog.close());
  els.saveSkuBtn.addEventListener("click", saveSkuFromDialog);

  els.scenarioSelect.addEventListener("change", applyScenario);
  els.calcChannel.addEventListener("change", () => {
    applyChannelDefaults();
    recalc();
  });
  els.parseSpecBtn.addEventListener("click", () => {
    state.componentRows = parseSpec(els.calcSpec.value, els.calcProduct.value, true);
    renderComponentRows();
    recalc();
  });
  els.addLineBtn.addEventListener("click", () => {
    state.componentRows.push({ product: els.calcProduct.value || GENERAL_PRODUCT, name: firstComponentName(), quantity: 1, unitCost: costFor(els.calcProduct.value, firstComponentName()) || 0 });
    renderComponentRows();
    recalc();
  });

  for (const input of document.querySelectorAll("#calculatorView input")) {
    input.addEventListener("input", recalc);
  }
  els.calcProduct.addEventListener("input", () => {
    state.componentRows = parseSpec(els.calcSpec.value, els.calcProduct.value, true);
    renderComponentRows();
    recalc();
  });
  els.calcSpec.addEventListener("change", () => {
    state.componentRows = parseSpec(els.calcSpec.value, els.calcProduct.value, true);
    renderComponentRows();
    recalc();
  });

  els.resetCostsBtn.addEventListener("click", () => {
    localStorage.removeItem("roiSystemCostRows");
    localStorage.removeItem("roiSystemCosts");
    state.costs = defaultCostRows();
    saveCostRows();
    renderAll();
  });
  els.exportConfigBtn.addEventListener("click", exportConfig);
  els.importConfigInput.addEventListener("change", importConfig);
  els.addCostBtn.addEventListener("click", addOrUpdateCost);
}

function setDefaults() {
  const d = state.data.defaults;
  els.dataTime.textContent = `生成时间 ${new Date(state.data.generatedAt).toLocaleString("zh-CN")}`;

  els.overviewRefundRate.value = pct(d.refundRate);
  els.overviewRefundCorrectionRate.value = 1;
  els.overviewShareRate.value = pct(d.shareRate);
  els.overviewPlatformRate.value = pct(d.platformRate);
  els.overviewLaborRate.value = pct(d.laborRate);
  els.overviewShippingCost.value = d.shippingCost;
  els.overviewFreightInsurance.value = d.freightInsurance;
  els.overviewInfluencerRate.value = pct(d.influencerRate);
  els.overviewLeaderRate.value = pct(d.leaderRate);

  els.refundRate.value = pct(d.refundRate);
  els.refundCorrectionRate.value = 1;
  els.shippingCost.value = d.shippingCost;
  els.freightInsurance.value = d.freightInsurance;
  els.platformRate.value = pct(d.platformRate);
  els.shareRate.value = pct(d.shareRate);
  els.laborRate.value = pct(d.laborRate);
  els.influencerRate.value = 0;
  els.leaderRate.value = 0;
  els.calcProduct.value = "麦卢卡蜂蜜香润糖88g";
  els.calcSpec.value = "88g*1+15.6g*4";
  els.calcPrice.value = 88;
  els.oldPrice.value = 78;
  els.newPrice.value = 88;
  state.componentRows = parseSpec(els.calcSpec.value, els.calcProduct.value, true);
}

function renderAll() {
  renderDepartmentFilter();
  renderProductFilter();
  renderProductList();
  renderScenarioSelect();
  renderOverview();
  renderComponentRows();
  renderCostTable();
  recalc();
}

function switchView(viewName) {
  document.querySelectorAll(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.getElementById(`${viewName}View`).classList.add("active");
}

function renderDepartmentFilter() {
  const current = els.departmentFilter.value;
  const departments = ["全部", ...new Set(state.skus.map((row) => row.department).filter(Boolean))];
  els.departmentFilter.innerHTML = departments.map((dept) => `<option value="${escapeAttr(dept)}">${escapeHtml(dept)}</option>`).join("");
  if (departments.includes(current)) els.departmentFilter.value = current;
}

function renderProductFilter() {
  const current = els.productFilter.value;
  const dept = els.departmentFilter.value || "全部";
  const products = [
    "全部",
    ...new Set(
      state.skus
        .filter((row) => dept === "全部" || row.department === dept)
        .map((row) => row.productName)
        .filter(Boolean)
    ),
  ].sort((a, b) => a === "全部" ? -1 : b === "全部" ? 1 : a.localeCompare(b, "zh-Hans-CN"));
  els.productFilter.innerHTML = products.map((product) => `<option value="${escapeAttr(product)}">${escapeHtml(product)}</option>`).join("");
  els.productFilter.value = products.includes(current) ? current : "全部";
}

function renderProductList() {
  const products = [...new Set([...state.skus.map((row) => row.productName), ...state.costs.map((row) => row.product)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  els.productList.innerHTML = products.map((product) => `<option value="${escapeAttr(product)}"></option>`).join("");
}

function renderEditDepartmentOptions(selected = "") {
  const departments = [...new Set(state.skus.map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  if (selected && !departments.includes(selected)) departments.unshift(selected);
  els.editDepartment.innerHTML = departments.map((dept) => `<option value="${escapeAttr(dept)}">${escapeHtml(dept)}</option>`).join("");
  if (selected) els.editDepartment.value = selected;
}

function renderScenarioSelect() {
  const currentOptions = state.skus.map((row) => ({
    type: "current",
    id: row.id,
    label: `现售 | ${row.department} | ${row.productName} | ${row.sku} | ${money(row.price)}`,
  }));
  const calcOptions = state.data.calcRows.map((row) => ({
    type: "calc",
    id: row.id,
    label: `测算表 | ${row.productName} | ${row.channel || "未标渠道"} | ${row.spec} | ${money(row.price)}`,
  }));
  const options = [{ type: "", id: "", label: "不套用，手动输入" }, ...currentOptions, ...calcOptions];
  els.scenarioSelect.innerHTML = options.map((item) => `<option value="${escapeAttr(`${item.type}:${item.id}`)}">${escapeHtml(item.label)}</option>`).join("");
}

function renderOverview() {
  const dept = els.departmentFilter.value || "全部";
  renderProductFilter();
  const product = els.productFilter.value || "全部";
  const keyword = els.searchInput.value.trim().toLowerCase();
  const params = overviewParams();
  const rows = state.skus
    .filter((row) => dept === "全部" || row.department === dept)
    .filter((row) => product === "全部" || row.productName === product)
    .filter((row) => !keyword || `${row.productName} ${row.sku} ${row.skuName || ""}`.toLowerCase().includes(keyword))
    .map((row) => {
      const rowParams = { ...params, refundRate: effectiveRefundRate(row, params.refundRate) };
      return { source: row, calc: calculateForSpec(row.sku, row.price, row.productName, rowParams), refundRate: rowParams.refundRate };
    });

  const calculated = rows.filter((row) => row.calc.unknownComponents.length === 0 && row.calc.grossProfit > 0);
  const avgRoi = calculated.length ? calculated.reduce((sum, row) => sum + row.calc.roiRefund, 0) / calculated.length : null;

  els.metricSkuCount.textContent = rows.length;
  els.metricCalculatedCount.textContent = calculated.length;
  els.metricMissingCount.textContent = rows.length - calculated.length;
  els.metricAvgRoi.textContent = avgRoi ? roi(avgRoi) : "-";

  els.skuTableBody.innerHTML = rows.map(renderSkuRow).join("");
  els.skuTableBody.querySelectorAll("[data-action='edit']").forEach((btn) => btn.addEventListener("click", () => openSkuDialog(btn.dataset.id)));
  els.skuTableBody.querySelectorAll("[data-action='delete']").forEach((btn) => btn.addEventListener("click", () => deleteSku(btn.dataset.id)));
}

function renderSkuRow({ source, calc, refundRate }) {
  const status = calc.unknownComponents.length
    ? `<span class="status warn">缺成本：${escapeHtml(calc.unknownComponents.join("、"))}</span>`
    : calc.grossProfit <= 0
      ? `<span class="status bad">亏损</span>`
      : `<span class="status ok">可测算</span>`;
  const refundLabel = source.refundRateOverride === null || source.refundRateOverride === undefined
    ? `${pct(refundRate)}%`
    : `${pct(refundRate)}% 单品`;
  return `
    <tr>
      <td>${escapeHtml(source.department)}</td>
      <td class="product-cell">${escapeHtml(source.productName)}</td>
      <td class="sku-cell">${escapeHtml(source.sku)}</td>
      <td class="num">${money(source.price)}</td>
      <td class="num">${escapeHtml(refundLabel)}</td>
      <td class="num">${calc.unknownComponents.length ? "-" : money(calc.productCost)}</td>
      <td class="num">${calc.unknownComponents.length ? "-" : percent(calc.margin)}</td>
      <td class="num">${calc.unknownComponents.length ? "-" : roi(calc.roiNet)}</td>
      <td class="num">${calc.unknownComponents.length ? "-" : roi(calc.roiRefund)}</td>
      <td>${status}</td>
      <td class="actions-cell">
        <button type="button" data-action="edit" data-id="${escapeAttr(source.id)}">编辑</button>
        <button type="button" data-action="delete" data-id="${escapeAttr(source.id)}">删除</button>
      </td>
    </tr>
  `;
}

function openSkuDialog(id = null) {
  state.editingSkuId = id;
  const row = id ? state.skus.find((item) => item.id === id) : null;
  const selectedDepartment = row?.department || (els.departmentFilter.value === "全部" ? "" : els.departmentFilter.value);
  renderEditDepartmentOptions(selectedDepartment);
  els.skuDialogTitle.textContent = row ? "编辑机制" : "新增机制";
  els.editDepartment.value = selectedDepartment || els.editDepartment.value;
  els.editProduct.value = row?.productName || "";
  els.editSku.value = row?.sku || "";
  els.editPrice.value = row?.price ?? "";
  els.editRefundRate.value = row?.refundRateOverride === null || row?.refundRateOverride === undefined ? "" : pct(row.refundRateOverride);
  els.skuDialog.showModal();
}

function saveSkuFromDialog() {
  const row = {
    id: state.editingSkuId || `manual-${Date.now()}`,
    department: els.editDepartment.value.trim() || "未分部门",
    productName: els.editProduct.value.trim() || "未命名商品",
    sku: els.editSku.value.trim(),
    skuName: "",
    price: toNumber(els.editPrice.value),
    refundRateOverride: els.editRefundRate.value === "" ? null : toNumber(els.editRefundRate.value) / 100,
    manual: true,
  };
  if (!row.sku || row.price <= 0) return;
  if (state.editingSkuId) {
    state.skus = state.skus.map((item) => item.id === state.editingSkuId ? { ...item, ...row } : item);
  } else {
    state.skus.unshift(row);
  }
  saveSkus();
  els.skuDialog.close();
  renderDepartmentFilter();
  renderProductList();
  renderScenarioSelect();
  renderOverview();
}

function deleteSku(id) {
  const row = state.skus.find((item) => item.id === id);
  if (!row) return;
  if (!window.confirm(`删除机制：${row.productName} / ${row.sku}？`)) return;
  const deleted = loadDeletedSkuIds();
  deleted.add(id);
  saveDeletedSkuIds(deleted);
  state.skus = state.skus.filter((item) => item.id !== id);
  saveSkus();
  renderDepartmentFilter();
  renderScenarioSelect();
  renderOverview();
}

function applyScenario() {
  const [type, id] = els.scenarioSelect.value.split(":");
  if (!type || !id) return;

  let row;
  if (type === "current") row = state.skus.find((item) => item.id === id);
  if (type === "calc") row = state.data.calcRows.find((item) => item.id === id);
  if (!row) return;

  const spec = row.sku || row.spec;
  const productName = row.productName || "";
  els.calcProduct.value = productName;
  els.calcSpec.value = spec;
  els.calcPrice.value = row.price;
  els.oldPrice.value = row.price;
  els.newPrice.value = Math.round((row.price + 10) * 100) / 100;

  if (type === "calc") {
    els.shippingCost.value = row.shippingCost;
    els.freightInsurance.value = row.freightInsurance;
    const channelType = row.influencerCommission || row.leaderCommission ? "influencer" : "self";
    els.calcChannel.value = channelType;
    els.influencerRate.value = pct(row.price ? row.influencerCommission / row.price : 0);
    els.leaderRate.value = pct(row.price ? row.leaderCommission / row.price : 0);
    state.componentRows = [
      { product: productName, name: "商品成本", quantity: 1, unitCost: row.productCost },
      { product: productName, name: "赠品成本", quantity: 1, unitCost: row.giftCost },
    ].filter((item) => item.unitCost > 0);
  } else {
    state.componentRows = parseSpec(spec, productName, true);
    applyChannelDefaults();
  }
  renderComponentRows();
  recalc();
}

function applyChannelDefaults() {
  if (els.calcChannel.value === "self") {
    els.influencerRate.value = 0;
    els.leaderRate.value = 0;
  } else {
    els.influencerRate.value = pct(state.data.defaults.influencerRate);
    els.leaderRate.value = pct(state.data.defaults.leaderRate);
  }
}

function renderComponentRows() {
  const componentNames = [
    ...new Set([...state.costs.map((row) => row.component), ...state.componentRows.map((row) => row.name)].filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  els.componentList.innerHTML = state.componentRows
    .map((row, index) => {
      const options = componentNames.map((name) => {
        const hasCost = Number.isFinite(costFor(els.calcProduct.value, name));
        const suffix = hasCost ? "" : "（未维护成本）";
        return `<option value="${escapeAttr(name)}" ${name === row.name ? "selected" : ""}>${escapeHtml(name + suffix)}</option>`;
      }).join("");
      return `
        <div class="component-row" data-index="${index}">
          <label>
            组件
            <select data-field="name">${options}</select>
          </label>
          <label>
            数量
            <input data-field="quantity" type="number" step="0.01" value="${numberValue(row.quantity)}" />
          </label>
          <label>
            单价成本
            <input data-field="unitCost" type="number" step="0.01" value="${numberValue(row.unitCost)}" />
          </label>
          <button type="button" title="删除">×</button>
        </div>
      `;
    }).join("");

  els.componentList.querySelectorAll(".component-row").forEach((rowEl) => {
    const index = Number(rowEl.dataset.index);
    rowEl.querySelector("button").addEventListener("click", () => {
      state.componentRows.splice(index, 1);
      renderComponentRows();
      recalc();
    });
    rowEl.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.field;
        if (field === "name") {
          state.componentRows[index].name = input.value;
          state.componentRows[index].unitCost = costFor(els.calcProduct.value, input.value) ?? state.componentRows[index].unitCost ?? 0;
          renderComponentRows();
        } else {
          state.componentRows[index][field] = toNumber(input.value);
        }
        recalc();
      });
    });
  });
}

function renderCostTable() {
  const rows = [...state.costs].sort((a, b) =>
    a.product.localeCompare(b.product, "zh-Hans-CN") || a.component.localeCompare(b.component, "zh-Hans-CN")
  );
  els.costTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.product)}</td>
      <td>${escapeHtml(row.component)}</td>
      <td class="num">
        <input class="cost-input" data-id="${escapeAttr(row.id)}" type="number" step="0.01" value="${numberValue(row.unitCost)}" />
      </td>
      <td class="muted">${escapeHtml(row.source || "手动维护")}</td>
    </tr>
  `).join("");
  els.costTableBody.querySelectorAll(".cost-input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = state.costs.find((item) => item.id === input.dataset.id);
      if (!row) return;
      row.unitCost = toNumber(input.value);
      saveCostRows();
      refreshComponentUnitCosts();
      renderOverview();
      recalc();
    });
  });
}

function addOrUpdateCost() {
  const product = els.newCostProduct.value.trim() || GENERAL_PRODUCT;
  const component = els.newCostName.value.trim();
  const unitCost = toNumber(els.newCostValue.value);
  if (!component || unitCost <= 0) return;
  const id = costId(product, component);
  const existing = state.costs.find((row) => row.id === id);
  if (existing) {
    existing.unitCost = unitCost;
    existing.source = "手动维护";
  } else {
    state.costs.push({ id, product, component, unitCost, source: "手动维护" });
  }
  saveCostRows();
  els.newCostName.value = "";
  els.newCostValue.value = "";
  renderProductList();
  renderCostTable();
  renderComponentRows();
  renderOverview();
  recalc();
}

function recalc() {
  const params = calculatorParams();
  const componentCost = state.componentRows.reduce((sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitCost), 0);
  const result = calculate({ price: toNumber(els.calcPrice.value), productCost: componentCost, params });

  els.roiNetResult.textContent = roi(result.roiNet);
  els.roiRefundResult.textContent = roi(result.roiRefund);
  els.marginResult.textContent = percent(result.margin);
  els.profitResult.textContent = money(result.grossProfit);
  els.productCostResult.textContent = money(result.productCost);
  els.deliveryCostResult.textContent = money(result.deliveryCost);

  updateComparison(params, componentCost);
}

function updateComparison(params, componentCost) {
  const oldResult = calculate({ price: toNumber(els.oldPrice.value), productCost: componentCost, params });
  const newResult = calculate({ price: toNumber(els.newPrice.value), productCost: componentCost, params });
  els.compareOutput.innerHTML = `
    <span class="compare-pill">原售价 ROI：${roi(oldResult.roiRefund)}</span>
    <span class="compare-pill">新售价 ROI：${roi(newResult.roiRefund)}</span>
    <span class="compare-pill ${newResult.roiRefund < oldResult.roiRefund ? "positive" : "negative"}">变化：${delta(newResult.roiRefund - oldResult.roiRefund)}</span>
  `;
}

function calculateForSpec(spec, price, productName, params) {
  const components = parseSpec(spec, productName, false);
  const unknownComponents = components.length
    ? components.filter((item) => !Number.isFinite(item.unitCost) || item.unitCost <= 0).map((item) => `${item.name}`)
    : ["未识别SKU组件"];
  const productCost = components.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitCost), 0);
  return { ...calculate({ price, productCost, params }), unknownComponents, components };
}

function calculate({ price, productCost, params }) {
  const platformFee = price * params.platformRate;
  const shareFee = price * params.shareRate;
  const laborFee = price * params.laborRate;
  const influencerCommission = price * params.influencerRate;
  const leaderCommission = price * params.leaderRate;
  const deliveryCost = productCost + params.shippingCost + platformFee + shareFee + laborFee + params.freightInsurance;
  const grossProfit = price - deliveryCost - influencerCommission - leaderCommission;
  const margin = price > 0 ? grossProfit / price : 0;
  const roiNet = grossProfit > 0 ? price / grossProfit : Infinity;
  const refundBase = 1 - params.refundRate + params.refundCorrectionRate;
  const roiRefund = Number.isFinite(roiNet) && refundBase > 0 ? roiNet / refundBase : Infinity;
  return { price, productCost, deliveryCost, grossProfit, margin, roiNet, roiRefund };
}

function parseSpec(spec, productName, allowFallback = false) {
  const clean = String(spec || "").replace(/[（）]/g, "").replace(/克/g, "g");
  const componentNames = [...new Set(state.costs.map((row) => row.component))]
    .sort((a, b) => b.length - a.length);
  const rows = [];

  for (const name of componentNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*(?:\\*|x|X|×)\\s*(\\d+(?:\\.\\d+)?)`, "g");
    let match;
    while ((match = re.exec(clean))) {
      rows.push({ product: productName || GENERAL_PRODUCT, name, quantity: Number(match[1]), unitCost: costFor(productName, name) ?? 0 });
    }
  }

  const generic = /([\u4e00-\u9fa5A-Za-z0-9.]+g?)\s*(?:\*|x|X|×)\s*(\d+(?:\.\d+)?)/g;
  let match;
  while ((match = generic.exec(clean))) {
    const name = match[1];
    if (rows.some((item) => item.name === name && item.quantity === Number(match[2]))) continue;
    rows.push({ product: productName || GENERAL_PRODUCT, name, quantity: Number(match[2]), unitCost: costFor(productName, name) ?? 0 });
  }

  if (rows.length) return rows;
  return allowFallback ? [{ product: productName || GENERAL_PRODUCT, name: firstComponentName(), quantity: 1, unitCost: costFor(productName, firstComponentName()) ?? 0 }] : [];
}

function overviewParams() {
  const channel = els.overviewChannel.value;
  return {
    refundRate: toNumber(els.overviewRefundRate.value) / 100,
    refundCorrectionRate: toNumber(els.overviewRefundCorrectionRate.value) / 100,
    shippingCost: toNumber(els.overviewShippingCost.value),
    freightInsurance: toNumber(els.overviewFreightInsurance.value),
    platformRate: toNumber(els.overviewPlatformRate.value) / 100,
    shareRate: toNumber(els.overviewShareRate.value) / 100,
    laborRate: toNumber(els.overviewLaborRate.value) / 100,
    influencerRate: channel === "self" ? 0 : toNumber(els.overviewInfluencerRate.value) / 100,
    leaderRate: channel === "self" ? 0 : toNumber(els.overviewLeaderRate.value) / 100,
  };
}

function calculatorParams() {
  const channel = els.calcChannel.value;
  return {
    refundRate: toNumber(els.refundRate.value) / 100,
    refundCorrectionRate: toNumber(els.refundCorrectionRate.value) / 100,
    shippingCost: toNumber(els.shippingCost.value),
    freightInsurance: toNumber(els.freightInsurance.value),
    platformRate: toNumber(els.platformRate.value) / 100,
    shareRate: toNumber(els.shareRate.value) / 100,
    laborRate: toNumber(els.laborRate.value) / 100,
    influencerRate: channel === "self" ? 0 : toNumber(els.influencerRate.value) / 100,
    leaderRate: channel === "self" ? 0 : toNumber(els.leaderRate.value) / 100,
  };
}

function effectiveRefundRate(row, defaultRate) {
  return row.refundRateOverride === null || row.refundRateOverride === undefined ? defaultRate : row.refundRateOverride;
}

function loadSkus() {
  const source = state.data.currentSkus.map((row) => ({
    ...row,
    refundRateOverride: null,
    manual: false,
  }));
  const deleted = loadDeletedSkuIds();
  try {
    const saved = JSON.parse(localStorage.getItem("roiSystemSkus") || "null");
    if (Array.isArray(saved) && saved.length) {
      const savedById = new Map(saved.map((row) => [row.id, row]));
      const merged = source
        .filter((row) => !deleted.has(row.id))
        .map((row) => {
          const saved = savedById.get(row.id);
          if (!saved) return row;
          if (saved.manual) return { ...row, ...saved };
          return {
            ...saved,
            ...row,
            refundRateOverride: saved.refundRateOverride ?? row.refundRateOverride,
          };
        });
      const manualRows = saved.filter((row) => row.manual && !deleted.has(row.id) && !merged.some((item) => item.id === row.id));
      const result = [...merged, ...manualRows];
      localStorage.setItem("roiSystemSkus", JSON.stringify(result));
      return result;
    }
  } catch {}
  if (Array.isArray(state.bundledState?.skus) && state.bundledState.skus.length) {
    const bundled = state.bundledState.skus.filter((row) => !deleted.has(row.id));
    localStorage.setItem("roiSystemSkus", JSON.stringify(bundled));
    return bundled;
  }
  const result = source.filter((row) => !deleted.has(row.id));
  localStorage.setItem("roiSystemSkus", JSON.stringify(result));
  return result;
}

function saveSkus() {
  localStorage.setItem("roiSystemSkus", JSON.stringify(state.skus));
}

function loadDeletedSkuIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem("roiSystemDeletedSkuIds") || "[]"));
  } catch {
    return new Set();
  }
}

function saveDeletedSkuIds(ids) {
  localStorage.setItem("roiSystemDeletedSkuIds", JSON.stringify([...ids]));
}

function loadCostRows() {
  try {
    const savedRows = JSON.parse(localStorage.getItem("roiSystemCostRows") || "null");
    if (Array.isArray(savedRows) && savedRows.length) {
      const merged = mergeDefaultCosts(savedRows);
      localStorage.setItem("roiSystemCostRows", JSON.stringify(merged));
      return merged;
    }
  } catch {}

  const rows = Array.isArray(state.bundledState?.costs) && state.bundledState.costs.length
    ? mergeDefaultCosts(state.bundledState.costs)
    : defaultCostRows();
  try {
    const oldCosts = JSON.parse(localStorage.getItem("roiSystemCosts") || "{}");
    for (const [component, meta] of Object.entries(oldCosts)) {
      const unitCost = typeof meta === "number" ? meta : meta?.unitCost;
      if (!Number.isFinite(Number(unitCost))) continue;
      upsertCostRow(rows, { product: GENERAL_PRODUCT, component, unitCost: Number(unitCost), source: "旧版通用成本迁移" });
    }
  } catch {}
  localStorage.setItem("roiSystemCostRows", JSON.stringify(rows));
  return rows;
}

async function loadBundledState() {
  try {
    const res = await fetch("./src/default-state.json", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === "object" ? json : null;
  } catch {
    return null;
  }
}

function defaultCostRows() {
  const preferredCosts = {
    "7g": 1.25,
    "10g": 2.4,
    "12g": 1.25,
    "15g": 0.9,
    "15.6g": 0.9,
    "21g": 4.5,
    "32g": 5,
    "48g": 4.8,
    "45g": 3.9,
    "70g": 22,
    "88g": 6.9,
    "98g": 8,
  };
  const rows = [];
  for (const [component, unitCost] of Object.entries(preferredCosts)) {
    upsertCostRow(rows, {
      product: GENERAL_PRODUCT,
      component,
      unitCost,
      source: "默认通用成本",
    });
  }
  for (const item of state.data.components) {
    if (preferredCosts[item.name] && Math.abs(item.unitCost - preferredCosts[item.name]) > 0.001) continue;
    upsertCostRow(rows, {
      product: item.sourceProduct || GENERAL_PRODUCT,
      component: item.name,
      unitCost: item.unitCost,
      source: `${item.sourceProduct || item.sourceSheet} / ${item.sourceSpec}`,
    });
  }
  return rows;
}

function mergeDefaultCosts(savedRows) {
  const rows = [...savedRows];
  const defaults = defaultCostRows();
  for (const row of defaults) {
    if (!rows.some((item) => item.id === row.id)) rows.push(row);
  }
  return rows;
}

function upsertCostRow(rows, row) {
  const id = costId(row.product, row.component);
  const existing = rows.find((item) => item.id === id);
  if (existing) Object.assign(existing, { ...row, id });
  else rows.push({ ...row, id });
}

function saveCostRows() {
  localStorage.setItem("roiSystemCostRows", JSON.stringify(state.costs));
}

function costFor(productName, component) {
  const product = productName || GENERAL_PRODUCT;
  const exact = state.costs.find((row) => row.product === product && row.component === component);
  if (exact) return exact.unitCost;
  const general = state.costs.find((row) => row.product === GENERAL_PRODUCT && row.component === component);
  if (general) return general.unitCost;
  return undefined;
}

function costId(product, component) {
  return `${product || GENERAL_PRODUCT}::${component}`;
}

function firstComponentName() {
  return [...new Set(state.costs.map((row) => row.component))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))[0] || "组件";
}

function refreshComponentUnitCosts() {
  for (const row of state.componentRows) {
    row.unitCost = costFor(els.calcProduct.value, row.name) ?? row.unitCost;
  }
  renderComponentRows();
}

function pct(value) {
  return Math.round(value * 1000) / 10;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value) * 100) / 100) : "0";
}

function money(value) {
  if (!Number.isFinite(value)) return "-";
  return formatter.format(Math.round(value * 100) / 100);
}

function percent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${formatter.format(value * 100)}%`;
}

function roi(value) {
  if (!Number.isFinite(value) || value <= 0) return "不可保本";
  return formatter.format(value);
}

function delta(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter.format(Math.round(value * 100) / 100)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function exportConfig() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    skus: JSON.parse(localStorage.getItem("roiSystemSkus") || "[]"),
    costs: JSON.parse(localStorage.getItem("roiSystemCostRows") || "[]"),
    deletedSkuIds: JSON.parse(localStorage.getItem("roiSystemDeletedSkuIds") || "[]"),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roi-system-config-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importConfig(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const config = JSON.parse(await file.text());
    if (!Array.isArray(config.skus) || !Array.isArray(config.costs)) {
      window.alert("配置文件格式不正确");
      return;
    }
    localStorage.setItem("roiSystemSkus", JSON.stringify(config.skus));
    localStorage.setItem("roiSystemCostRows", JSON.stringify(config.costs));
    localStorage.setItem("roiSystemDeletedSkuIds", JSON.stringify(config.deletedSkuIds || []));
    window.location.reload();
  } catch {
    window.alert("配置文件读取失败");
  } finally {
    event.target.value = "";
  }
}
