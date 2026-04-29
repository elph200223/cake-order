// ============================================================
// 月結工作表 - Apps Script
// 功能：
//   1. 設定頁管理欄位（新增/修改欄位只要改設定頁）
//   2. syncColumnHeaders() - 同步所有月份的欄位標題（資料隨欄位一起移動）
//   3. doPost(e) - 接收網站付款通知，自動寫入正確月份
//   4. 進貨記錄頁（新版）- 一筆進貨一列，右側年度預算用公式即時計算
//      格式：日期 | 廠商 | 品項描述 | 類別 | 數量/單位 | 金額
//            右側：年份選擇 + SUMPRODUCT 預算區（改 I1 的年份自動換）
//   5. syncMonthlyFixedCost() - 把年預算總計÷12寫入各月份「年度花費」格
//   6. migrateMonthlyToPurchaseRecord() - 把月份工作表舊資料搬到進貨記錄頁
// ============================================================

// ── 常數 ────────────────────────────────────────────────────
const SETTING_SHEET_NAME  = "設定";
const SUMMARY_SHEET_NAME  = "彙總";     // 保留名稱（刪除時用）
const PURCHASE_SHEET_NAME = "進貨記錄";
const MONTH_SHEETS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const DATA_START_ROW = 2;   // 第 1 列是標題，資料從第 2 列開始
const DATA_END_ROW   = 32;  // 最多 31 天
const TOTAL_ROW      = 34;  // 各欄加總放在第 34 列

// 固定欄位（不會出現在設定頁，永遠在最前面）
const FIXED_COLS = ["日期", "週", "星期"];

// API 金鑰（與網站端 .env 的 GAS_ORDER_API_KEY 相同）
const API_KEY = "請填入與網站相同的 API Key";

// 從月份工作表遷移到進貨記錄的欄位名稱
const MIGRATE_COLS = ["生豆", "茶葉", "洗碗機"];

// 各年度預算預設值（新建進貨記錄頁時自動填入）
const DEFAULT_BUDGETS = {
  2025: [
    ["員工旅遊", 35000],
    ["生豆",     85000],
    ["茶葉",     34000],
    ["包材",     25000],
    ["洗劑",     12000],
    ["濾芯",      6500],
    ["軟水",      5000],
  ],
  2026: [
    ["員工旅遊", 35000],
    ["生豆",     85000],
    ["茶葉",     34000],
    ["包材",     25000],
    ["洗劑",     12000],
    ["濾芯",      6500],
    ["軟水",      5000],
  ],
};

// 進貨記錄頁欄位定義（固定，不依賴設定頁）
const PURCHASE_HEADERS = ["日期", "廠商", "品項描述", "類別", "數量/單位", "金額"];
const P_COL_DATE    = 1; // A
const P_COL_VENDOR  = 2; // B
const P_COL_DESC    = 3; // C
const P_COL_CAT     = 4; // D
const P_COL_QTY     = 5; // E
const P_COL_AMOUNT  = 6; // F

// 預算區位置（右側）
const BUDGET_START_COL  = 8;  // H 欄起
const BUDGET_YEAR_ROW   = 1;  // H1=標籤, I1=年份
const BUDGET_HEADER_ROW = 2;  // H2-L2=欄位標題
const BUDGET_DATA_ROW   = 3;  // H3 起=各類別資料

// ── 設定頁格式 ──────────────────────────────────────────────
// 設定頁 A 欄：欄位名稱
// 設定頁 B 欄：預算類別（留空 = 不列入年度預算追蹤）
// 設定頁 C 欄：備註（填「進貨記錄」= 只在進貨記錄頁登錄，不在月份工作表）


// ── 初始化設定頁 ────────────────────────────────────────────
// 設定頁不存在 → 用預設值建立
// 設定頁已存在 → 掃描月份工作表，把設定頁沒有的欄位補進去
function setupSettingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTING_SHEET_NAME);

  if (sheet) {
    // 已存在：找出月份工作表有、但設定頁沒有的欄位，補進去
    const existingNames = new Set(getSettingCols().map(c => c.name));
    const missingCols   = [];

    MONTH_SHEETS.forEach(monthName => {
      const monthSheet = ss.getSheetByName(monthName);
      if (!monthSheet) return;
      const lastCol = monthSheet.getLastColumn();
      if (lastCol <= FIXED_COLS.length) return;
      const headers = monthSheet.getRange(1, FIXED_COLS.length + 1, 1, lastCol - FIXED_COLS.length)
                                .getValues()[0];
      headers.forEach(h => {
        const name = (h || "").toString().trim();
        if (name && !existingNames.has(name) && !missingCols.includes(name)) {
          missingCols.push(name);
          existingNames.add(name);
        }
      });
    });

    if (missingCols.length === 0) {
      SpreadsheetApp.getUi().alert("設定頁已是最新，所有月份欄位都已登錄。");
      return;
    }

    const insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, missingCols.length, 3)
         .setValues(missingCols.map(name => [name, "", "（自動補入，請確認）"]));

    SpreadsheetApp.getUi().alert(
      `已補入 ${missingCols.length} 個欄位到設定頁末尾：\n${missingCols.join("、")}\n\n` +
      "請確認「預算類別」和「備註」欄是否需要填寫。"
    );
    return;
  }

  // 不存在：建立新設定頁
  sheet = ss.insertSheet(SETTING_SHEET_NAME);
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);

  sheet.getRange("A1:C1").setValues([["欄位名稱", "預算類別", "備註"]]);
  sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#cfe2f3");

  const defaults = [
    ["營業額",   "",        "固定欄位，請勿刪除"],
    ["訂單",     "",        "網站蛋糕訂單進帳"],
    ["鮮乳坊",   "",        "供應商"],
    ["福市",     "",        "供應商"],
    ["蛋",       "",        "供應商"],
    ["德麥",     "",        "供應商"],
    ["水果",     "",        "供應商"],
    ["備品",     "備品",    ""],
    ["包材",     "包材",    ""],
    ["麵包空間", "",        "供應商"],
    ["雜支",     "",        ""],
    ["彰銀",     "",        ""],
    ["生豆",     "生豆",    "進貨記錄"],
    ["茶葉",     "茶葉",    "進貨記錄"],
    ["洗碗機",   "",        "進貨記錄"],
    ["洗劑",     "洗劑",    "進貨記錄"],
    ["濾芯",     "濾芯",    "進貨記錄"],
    ["軟水",     "軟水",    "進貨記錄"],
    ["員工旅遊", "員工旅遊","進貨記錄"],
  ];
  sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 200);

  SpreadsheetApp.getUi().alert("設定頁已建立！請確認欄位清單後再執行「同步所有月份欄位」。");
}


// ── 讀取設定頁欄位清單 ───────────────────────────────────────
function getSettingCols() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTING_SHEET_NAME);
  if (!sheet) throw new Error("找不到設定頁，請先執行「初始化設定頁」");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange("A2:C" + lastRow).getValues();
  const cols = [];
  data.forEach(row => {
    const name   = (row[0] || "").toString().trim();
    const budget = (row[1] || "").toString().trim();
    const note   = (row[2] || "").toString().trim();
    if (name) cols.push({ name, budget, note });
  });
  return cols;
}


// ── 同步所有月份的欄位標題（資料跟著欄位一起移動）──────────
//
// ⚠️  設計說明：
//   月份工作表的前 3 欄（A=日期、B=週、C=星期）在 Row 1 是空白標題，
//   由 Google Sheets 公式自動帶入，不由 GAS 命名。
//   因此本函式「只動第 4 欄起」的費用欄，絕不碰前 3 欄。
//
//   同時，Row 35 以後是固定費用區（勞保/薪資/房租…），
//   本函式只處理到 TOTAL_ROW（第 34 列），不碰以下任何列。
//
// ── 同步所有月份的欄位標題 ───────────────────────────────────
// 規則：
//   設定頁的欄位 → 排在前面，資料跟著欄位名稱移動
//   設定頁沒有的欄位 → 保留在後面，資料不丟失
//   前 3 欄（日期/週/星期）與第 35 列以下固定費用區完全不動
//
// ⚠️  實作說明：
//   資料列（第 2～32 列）只用 setValues，不用 setFormulas，
//   避免 setFormulas("") 把剛寫入的數字清掉。
//   合計列（第 34 列）單獨重建 SUM 公式，確保欄號隨欄位移動後仍正確。
function syncColumnHeaders() {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const cols        = getSettingCols();
  const FIXED_COUNT = FIXED_COLS.length;

  // 設定頁欄位分三類：
  //   settingCols       = 在月份工作表顯示的欄位（備註非「進貨記錄」）
  //   purchaseRecordSet = 已移到進貨記錄的欄位（備註 = 「進貨記錄」）→ 從月份工作表移除
  //   完全不在設定頁的欄位                                              → 保留在後方
  const settingCols       = cols.filter(c => c.note !== "進貨記錄").map(c => c.name);
  const settingSet        = new Set(settingCols);
  const purchaseRecordSet = new Set(cols.filter(c => c.note === "進貨記錄").map(c => c.name));

  let updated = 0;

  MONTH_SHEETS.forEach(monthName => {
    const sheet = ss.getSheetByName(monthName);
    if (!sheet) return;

    const lastCol = sheet.getLastColumn();

    // 讀取現有費用欄標題（第 4 欄起）
    const curExpHeaders = (lastCol > FIXED_COUNT)
      ? sheet.getRange(1, FIXED_COUNT + 1, 1, lastCol - FIXED_COUNT)
             .getValues()[0].map(h => (h || "").toString().trim())
      : [];

    // 完全不在設定頁的欄位（非 settingCols 也非 purchaseRecordSet）→ 保留在後方
    const extraCols  = curExpHeaders.filter(h => h && !settingSet.has(h) && !purchaseRecordSet.has(h));
    const newExpCols = [...settingCols, ...extraCols];

    // 已正確就跳過
    if (lastCol > FIXED_COUNT &&
        newExpCols.length === curExpHeaders.length &&
        newExpCols.every((h, i) => curExpHeaders[i] === h)) {
      updated++;
      return;
    }

    // ── 1. 讀取資料列（DATA_START_ROW ～ DATA_END_ROW）──
    const numDataRows = DATA_END_ROW - DATA_START_ROW + 1; // 固定 31 列
    const colData = {}, colNotes = {};

    if (lastCol > FIXED_COUNT) {
      const dataRange = sheet.getRange(DATA_START_ROW, FIXED_COUNT + 1, numDataRows, lastCol - FIXED_COUNT);
      const vals  = dataRange.getValues();
      const notes = dataRange.getNotes();
      curExpHeaders.forEach((name, i) => {
        if (!name) return;
        colData[name]  = vals.map(r  => r[i] ?? "");
        colNotes[name] = notes.map(r => r[i] ?? "");
      });
    }

    // ── 2. 清除標題列、資料列、合計列 ──
    const clearColCount = Math.max(
      lastCol > FIXED_COUNT ? lastCol - FIXED_COUNT : 0,
      newExpCols.length
    );
    if (clearColCount > 0) {
      sheet.getRange(1,            FIXED_COUNT + 1, 1,           clearColCount).clearContent();
      sheet.getRange(DATA_START_ROW, FIXED_COUNT + 1, numDataRows, clearColCount).clearContent().clearNote();
      sheet.getRange(TOTAL_ROW,    FIXED_COUNT + 1, 1,           clearColCount).clearContent();
    }

    // ── 3. 寫入標題 ──
    sheet.getRange(1, FIXED_COUNT + 1, 1, newExpCols.length).setValues([newExpCols]);

    // ── 4. 寫回資料列（只用 setValues，避免 setFormulas("") 清空數值）──
    const newVals = [], newNotes = [];
    for (let r = 0; r < numDataRows; r++) {
      newVals.push(newExpCols.map(h  => colData[h]  ? (colData[h][r]  ?? "") : ""));
      newNotes.push(newExpCols.map(h => colNotes[h] ? (colNotes[h][r] ?? "") : ""));
    }
    const destRange = sheet.getRange(DATA_START_ROW, FIXED_COUNT + 1, numDataRows, newExpCols.length);
    destRange.setValues(newVals);
    destRange.setNotes(newNotes);

    // ── 5. 重建合計列 SUM 公式（欄號依新位置重算）──
    newExpCols.forEach((_, i) => {
      const colNum    = FIXED_COUNT + 1 + i;
      const colLetter = _colLetter(colNum);
      sheet.getRange(TOTAL_ROW, colNum)
           .setFormula(`=SUM(${colLetter}${DATA_START_ROW}:${colLetter}${DATA_END_ROW})`);
    });

    updated++;
  });

  SpreadsheetApp.getUi().alert(
    `已同步 ${updated} 個月份！\n` +
    `‧ 設定頁欄位排前面，資料跟著欄位名稱移動\n` +
    `‧ 設定頁以外的欄位保留在後方，資料不丟失\n` +
    `‧ 前 3 欄與第 35 列以下固定費用區不動`
  );
}


// ── 找某月份工作表中某欄位的欄號（1-based）────────────────────
function findColIndex(sheet, colName) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return -1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = headers.indexOf(colName);
  return idx >= 0 ? idx + 1 : -1;
}


// ── doPost：接收網站訂單付款通知 ────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.apiKey !== API_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "INVALID_API_KEY" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.paymentStatus !== "PAID") {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, skipped: true, reason: "NOT_PAID" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const totalAmount = parseInt(body.totalAmount) || 0;
    const pickupDate  = body.pickupDate || "";
    const orderNo     = body.orderId || "";
    const action      = body.action || "newOrder";

    if (!totalAmount || !pickupDate) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "MISSING_AMOUNT_OR_DATE" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const dateParts = pickupDate.split("-");
    const month     = parseInt(dateParts[1]).toString();

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(month);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: `找不到工作表：${month}` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const orderColIdx = findColIndex(sheet, "訂單");
    if (orderColIdx < 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "找不到「訂單」欄，請確認設定頁" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "syncMonthTotal") {
      sheet.getRange(TOTAL_ROW, orderColIdx)
           .setValue(totalAmount)
           .setNote("網站本月已付款訂單加總：" + totalAmount + "；同步時間：" + new Date().toLocaleString("zh-TW"));
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: "syncMonthTotal", month, totalAmount }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const day       = parseInt(dateParts[2]);
    const targetRow = DATA_START_ROW + day - 1;

    const existingValue  = sheet.getRange(targetRow, orderColIdx).getValue();
    const existingAmount = parseInt(existingValue) || 0;
    sheet.getRange(targetRow, orderColIdx).setValue(existingAmount + totalAmount);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        action: "newOrder",
        month,
        day,
        orderNo,
        totalAmount,
        newCellValue: existingAmount + totalAmount,
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ── 新增年度預算對話框 ────────────────────────────────────────
function showAddYearDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("找不到進貨記錄頁，請先執行「初始化進貨記錄頁」");
    return;
  }

  // 讀取現有預算，推算預設值
  const existing = _readExistingBudgets(sheet);
  const existingYears = Object.keys(existing).map(Number).sort((a, b) => b - a);

  const defaultNewYear = existingYears.length > 0
    ? existingYears[0] + 1
    : new Date().getFullYear();

  // 預設類別來自最新年度（或 DEFAULT_BUDGETS）
  let defaultCats = [];
  if (existingYears.length > 0) {
    defaultCats = existing[existingYears[0]];
  } else {
    const firstYr = Object.keys(DEFAULT_BUDGETS).map(Number).sort((a, b) => b - a)[0];
    defaultCats = DEFAULT_BUDGETS[firstYr] || [];
  }

  const catRows = defaultCats.map(([cat, amt]) => `
    <tr>
      <td style="padding:5px 10px;font-size:13px;">${cat}</td>
      <td style="padding:5px 6px;">
        <input type="number" name="${cat}" value="${amt}"
               style="width:110px;padding:5px;font-size:13px;border:1px solid #ccc;border-radius:4px;">
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body{font-family:sans-serif;padding:16px;font-size:13px;color:#333;}
    .year-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
    table{border-collapse:collapse;width:100%;}
    th{text-align:left;padding:5px 10px;background:#cfe2f3;font-size:12px;}
    .btn{margin-top:16px;padding:9px 24px;background:#4a86e8;color:#fff;border:none;
         border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;}
    .btn:hover{background:#3a76d8;}
    .err{color:red;font-size:12px;margin-top:4px;}
  </style>
</head>
<body>
  <div class="year-row">
    <label style="font-weight:bold;">年度：</label>
    <input type="number" id="year" value="${defaultNewYear}"
           style="width:80px;padding:5px;font-size:14px;border:1px solid #ccc;border-radius:4px;">
  </div>
  <table>
    <tr><th>類別</th><th>年預算（元）</th></tr>
    ${catRows}
  </table>
  <div id="err" class="err"></div>
  <br>
  <button class="btn" onclick="submit()">新增年度預算</button>
  <script>
    function submit() {
      const year = parseInt(document.getElementById('year').value);
      if (!year || year < 2020 || year > 2050) {
        document.getElementById('err').textContent = '請輸入正確年份（2020～2050）';
        return;
      }
      const cats = {};
      document.querySelectorAll('input[name]').forEach(el => {
        cats[el.name] = parseInt(el.value) || 0;
      });
      document.querySelector('.btn').disabled = true;
      document.querySelector('.btn').textContent = '處理中…';
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler(e => {
          document.getElementById('err').textContent = '錯誤：' + e.message;
          document.querySelector('.btn').disabled = false;
          document.querySelector('.btn').textContent = '新增年度預算';
        })
        .processAddYearBudget(year, cats);
    }
  </script>
</body>
</html>`;

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(340).setHeight(460),
    "新增年度預算"
  );
}

// 對話框送出後由 GAS 執行
function processAddYearBudget(year, catsMap) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!sheet) throw new Error("找不到進貨記錄頁");

  // 讀回現有預算（保留既有年度金額）
  const budgets = _readExistingBudgets(sheet);

  if (budgets[year]) {
    throw new Error(`${year} 年度已存在，如要修改請直接在表格中編輯「年預算」欄位。`);
  }

  // 加入新年度
  budgets[year] = Object.entries(catsMap).map(([cat, amt]) => [cat, amt]);

  // 讀回現有進貨資料列
  const lastRow = sheet.getLastRow();
  let existingRows = [], existingNotes = [];
  if (lastRow >= 2) {
    const range    = sheet.getRange(2, 1, lastRow - 1, PURCHASE_HEADERS.length);
    const allRows  = range.getValues();
    const allNotes = range.getNotes();
    const combined = allRows
      .map((row, i) => ({ row, note: allNotes[i] }))
      .filter(({ row }) => {
        const dv = row[0];
        if (!dv) return false;
        const d = dv instanceof Date ? dv : new Date(dv);
        return !isNaN(d.getTime());
      });
    existingRows  = combined.map(c => c.row);
    existingNotes = combined.map(c => c.note);
  }

  // 重建版面（傳入含新年度的預算資料）
  _buildPurchaseLayout(sheet, existingRows, existingNotes, budgets);
}


// ── 選單 ─────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚙️ 帳務工具")
    .addItem("初始化設定頁", "setupSettingSheet")
    .addItem("同步所有月份欄位", "syncColumnHeaders")
    .addSeparator()
    .addItem("初始化進貨記錄頁（保留既有資料）", "setupPurchaseSheet")
    .addItem("新增年度預算", "showAddYearDialog")
    .addItem("匯入月份工作表舊有進貨資料", "migrateMonthlyToPurchaseRecord")
    .addItem("同步年度花費到各月份", "syncMonthlyFixedCost")
    .addSeparator()
    .addItem("開啟備註側邊欄", "showSidebar")
    .addToUi();
}


// ── 側邊欄 ────────────────────────────────────────────────────
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("備註側邊欄")
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getGroupedItemList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ItemList");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues().filter(row => row[0]);
  const grouped = {};
  data.forEach(row => {
    const item   = row[0].toString().trim();
    const vendor = (row[1] || "未分類").toString().trim();
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(item);
  });
  return grouped;
}

function insertNote(text) {
  const cell = SpreadsheetApp.getActiveSpreadsheet().getActiveCell();
  cell.setNote(text);
}

function addItemToList(item, vendor) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ItemList");
  if (!sheet) return;
  const items = sheet.getRange("A1:A" + sheet.getLastRow()).getValues().flat();
  if (!items.includes(item)) {
    sheet.appendRow([item, vendor || ""]);
  }
}


// ════════════════════════════════════════════════════════════
// 進貨記錄頁功能（新版：一筆進貨一列）
// 格式：日期 | 廠商 | 品項描述 | 類別 | 數量/單位 | 金額
//       右側 H-L：年份選擇 + SUMPRODUCT 年度預算區
// ════════════════════════════════════════════════════════════

// ── 欄號轉字母（1→A, 8→H, 12→L）────────────────────────────
function _colLetter(n) {
  let s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + (n - 1) % 26) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}


// ── 偵測進貨記錄頁目前格式 ───────────────────────────────────
// 回傳 "new"（新版一筆一列）、"old"（舊版欄位式）、"empty"
function _detectPurchaseFormat(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return "empty";
  const lastCol = Math.min(sheet.getLastColumn(), 6);
  if (lastCol < 1) return "empty";
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const h0 = (headers[0] || "").toString().trim();
  const h2 = (headers[2] || "").toString().trim();
  if (h0 === "日期" && h2 === "品項描述") return "new";
  if (h0 === "日期" && h2 !== "品項描述" && h2 !== "") return "old";
  return "empty";
}


// ── 讀取舊版欄位式進貨記錄，轉成新版一列一筆格式 ──────────
// 舊版格式：Row 1 = [日期, 廠商, 生豆, 茶葉, ...]
//           Row 2+ = 資料（A 欄為 Date），最後一列可能是「合計」
// 回傳 { rows: [...], notes: [...] }
// 舊格式金額欄的 cell 備註會移到新格式的「品項描述」欄（C 欄）
function _convertOldPurchaseToRows(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || lastCol < 3) return { rows: [], notes: [] };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  // 第 3 欄起為類別欄（0-based index 2+）
  const catCols = [];
  for (let i = 2; i < headers.length; i++) {
    const name = (headers[i] || "").toString().trim();
    if (name) catCols.push({ name, idx: i });
  }
  if (catCols.length === 0) return { rows: [], notes: [] };

  const srcRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const data     = srcRange.getValues();
  const noteData = srcRange.getNotes();
  const combined = [];

  data.forEach((row, rowIdx) => {
    const dateVal = row[0];
    if (!dateVal) return;
    // 跳過「合計」等非日期列
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal.toString().replace(/\//g, "-"));
    if (isNaN(d.getTime())) return;

    const vendor = (row[1] || "").toString().trim();

    catCols.forEach(({ name, idx }) => {
      const amount = parseFloat(row[idx]) || 0;
      if (amount === 0) return;
      // 舊格式備註（在金額欄）→ 新格式「品項描述」欄的可見值（不是隱藏 cell note）
      const oldNote = (noteData[rowIdx][idx] || "").toString().trim();
      combined.push({
        row:  [d, vendor, oldNote, name, "", amount],
        note: ["", "", "", "", "", ""],
      });
    });
  });

  // 按日期排序（rows 與 notes 同步）
  combined.sort((a, b) => a.row[0] - b.row[0]);
  return {
    rows:  combined.map(c => c.row),
    notes: combined.map(c => c.note),
  };
}


// ── 讀取進貨記錄頁右側現有預算資料 ──────────────────────────
// 回傳 { 2026: [["生豆", 85000], ...], 2025: [...] }
function _readExistingBudgets(sheet) {
  const result = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return result;

  const data = sheet.getRange(1, BUDGET_START_COL, lastRow, 5).getValues();
  let currentYear = null;

  for (let r = 0; r < data.length; r++) {
    const hVal = (data[r][0] || "").toString().trim();
    const iVal = data[r][1]; // I 欄 = 年預算

    const yearMatch = hVal.match(/^(\d{4})\s*年度預算$/);
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1]);
      result[currentYear] = [];
      continue;
    }
    if (currentYear === null) continue;
    if (!hVal || hVal === "類別" || hVal === "合計") continue;
    result[currentYear].push([hVal, parseFloat(iVal) || 0]);
  }
  return result;
}


// ── 建立進貨記錄頁版面（欄位標題 + 右側預算區）─────────────
// 傳入 existingRows / existingNotes 會在建立後寫回資料列與備註
// 傳入 budgetData（同 DEFAULT_BUDGETS 格式）可覆蓋預設值
function _buildPurchaseLayout(sheet, existingRows, existingNotes, budgetData) {
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearNote();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();

  // ── 左側：進貨流水帳標題列 ──
  sheet.getRange(1, 1, 1, PURCHASE_HEADERS.length).setValues([PURCHASE_HEADERS]);
  sheet.getRange(1, 1, 1, PURCHASE_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#ffe599")
    .setHorizontalAlignment("center");

  // 欄寬
  sheet.setColumnWidth(P_COL_DATE,   110);
  sheet.setColumnWidth(P_COL_VENDOR, 140);
  sheet.setColumnWidth(P_COL_DESC,   220);
  sheet.setColumnWidth(P_COL_CAT,    110);
  sheet.setColumnWidth(P_COL_QTY,    110);
  sheet.setColumnWidth(P_COL_AMOUNT, 100);

  // 第 7 欄（G）：分隔空欄
  sheet.setColumnWidth(7, 30);

  // 日期格式 + 金額格式（預先設定大範圍，確保輸入時自動套用）
  sheet.getRange(2, P_COL_DATE,   1000, 1).setNumberFormat("yyyy/MM/dd");
  sheet.getRange(2, P_COL_AMOUNT, 1000, 1).setNumberFormat("#,##0");

  // ── 右側：各年度預算區（每年獨立一塊，垂直疊放）──
  // 設計：每年一塊，年份寫死在 SUMPRODUCT，互不相干
  //       新年度在上方，歷史年度往下
  //       年預算是純數值，可直接在格子裡修改
  const H = _colLetter(BUDGET_START_COL);     // H
  const I = _colLetter(BUDGET_START_COL + 1); // I
  const J = _colLetter(BUDGET_START_COL + 2); // J
  const K = _colLetter(BUDGET_START_COL + 3); // K
  const L = _colLetter(BUDGET_START_COL + 4); // L

  // 欄寬
  sheet.setColumnWidth(BUDGET_START_COL,     120); // H 類別
  sheet.setColumnWidth(BUDGET_START_COL + 1, 100); // I 年預算
  sheet.setColumnWidth(BUDGET_START_COL + 2, 100); // J 已花費
  sheet.setColumnWidth(BUDGET_START_COL + 3, 100); // K 剩餘
  sheet.setColumnWidth(BUDGET_START_COL + 4,  80); // L 使用%

  // 使用傳入的預算資料，或 fallback 到 DEFAULT_BUDGETS
  const bd = (budgetData && Object.keys(budgetData).length > 0) ? budgetData : DEFAULT_BUDGETS;

  // 所有年度，新到舊排序
  const years = Object.keys(bd).map(Number).sort((a, b) => b - a);

  // 收集所有年度類別的聯集（保留出現順序）
  const allCatSet  = new Set();
  const allCatList = [];
  years.forEach(yr => {
    (bd[yr] || []).forEach(([cat]) => {
      if (!allCatSet.has(cat)) { allCatSet.add(cat); allCatList.push(cat); }
    });
  });

  // 每塊高度：1標題 + 1欄位標題 + n類別 + 1合計 + 1空白分隔
  const ROWS_PER_YEAR = allCatList.length + 4;

  years.forEach((yr, yi) => {
    const sectionStart = 1 + yi * ROWS_PER_YEAR;
    const titleRow  = sectionStart;
    const headerRow = sectionStart + 1;
    const dataStart = sectionStart + 2;
    const totalRow  = dataStart + allCatList.length;

    // 標題列（合併 H–L，藍底白字）
    sheet.getRange(titleRow, BUDGET_START_COL, 1, 5).merge()
      .setValue(`${yr} 年度預算`)
      .setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center")
      .setBackground("#4a86e8").setFontColor("#ffffff");

    // 欄位標題列
    sheet.getRange(headerRow, BUDGET_START_COL, 1, 5)
      .setValues([["類別", "年預算", "已花費", "剩餘", "使用%"]])
      .setFontWeight("bold").setBackground("#cfe2f3").setHorizontalAlignment("center");

    // 各類別資料列
    const yrBudgetMap = Object.fromEntries(
      (bd[yr] || []).map(([c, v]) => [c, v])
    );

    allCatList.forEach((catName, ci) => {
      const r      = dataStart + ci;
      const catRef = `${H}${r}`;

      sheet.getRange(r, BUDGET_START_COL).setValue(catName);

      // 年預算：純數值，可直接修改
      sheet.getRange(r, BUDGET_START_COL + 1).setValue(yrBudgetMap[catName] || 0);

      // 已花費：SUMPRODUCT，年份寫死為 yr（與其他年度完全獨立）
      sheet.getRange(r, BUDGET_START_COL + 2).setFormula(
        `=IFERROR(SUMPRODUCT((IFERROR(YEAR($A$2:$A$5000),0)=${yr})*($D$2:$D$5000=${catRef})*($F$2:$F$5000)),0)`
      );

      // 剩餘
      sheet.getRange(r, BUDGET_START_COL + 3).setFormula(`=${I}${r}-${J}${r}`);

      // 使用%
      sheet.getRange(r, BUDGET_START_COL + 4)
        .setFormula(`=IF(${I}${r}>0,${J}${r}/${I}${r},0)`)
        .setNumberFormat("0.0%");
    });

    // 合計列
    sheet.getRange(totalRow, BUDGET_START_COL).setValue("合計");
    sheet.getRange(totalRow, BUDGET_START_COL + 1)
      .setFormula(`=SUM(${I}${dataStart}:${I}${totalRow - 1})`);
    sheet.getRange(totalRow, BUDGET_START_COL + 2)
      .setFormula(`=SUM(${J}${dataStart}:${J}${totalRow - 1})`);
    sheet.getRange(totalRow, BUDGET_START_COL + 3)
      .setFormula(`=SUM(${K}${dataStart}:${K}${totalRow - 1})`);
    sheet.getRange(totalRow, BUDGET_START_COL, 1, 5)
      .setFontWeight("bold").setBackground("#efefef");

    // 數字格式（年預算、已花費、剩餘）
    sheet.getRange(dataStart, BUDGET_START_COL + 1, allCatList.length + 1, 3)
      .setNumberFormat("#,##0");
  });

  // ── 寫入既有資料列與備註 ──
  if (existingRows && existingRows.length > 0) {
    const dataRange = sheet.getRange(2, 1, existingRows.length, PURCHASE_HEADERS.length);
    dataRange.setValues(existingRows);
    sheet.getRange(2, P_COL_DATE,   existingRows.length, 1).setNumberFormat("yyyy/MM/dd");
    sheet.getRange(2, P_COL_AMOUNT, existingRows.length, 1).setNumberFormat("#,##0");
    if (existingNotes && existingNotes.length === existingRows.length) {
      dataRange.setNotes(existingNotes);
    }
  }
}


// ── 初始化進貨記錄頁（自動偵測舊格式，資料不丟失）─────────
function setupPurchaseSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);

  if (!sheet) {
    // 全新建立
    sheet = ss.insertSheet(PURCHASE_SHEET_NAME);
    _buildPurchaseLayout(sheet, []);
    SpreadsheetApp.getUi().alert(
      "進貨記錄頁已建立！\n\n" +
      "從第 2 列開始輸入進貨資料。\n" +
      "右側「查看年份（I1）」改成你想查的年份，已花費/剩餘/使用% 會自動重算。"
    );
    return;
  }

  const format = _detectPurchaseFormat(sheet);

  if (format === "new") {
    // 已是新格式：重建版面但保留資料與備註
    // 先讀回右側現有預算資料（保留用戶修改過的年預算金額）
    const existingBudgets = _readExistingBudgets(sheet);

    const lastRow = sheet.getLastRow();
    let existingRows  = [];
    let existingNotes = [];
    if (lastRow >= 2) {
      const range    = sheet.getRange(2, 1, lastRow - 1, PURCHASE_HEADERS.length);
      const allRows  = range.getValues();
      const allNotes = range.getNotes();
      const combined = allRows
        .map((row, i) => ({ row, note: allNotes[i] }))
        .filter(({ row }) => {
          const dv = row[0];
          if (!dv) return false;
          const d = dv instanceof Date ? dv : new Date(dv);
          return !isNaN(d.getTime());
        });
      existingRows  = combined.map(c => c.row);
      existingNotes = combined.map(c => c.note);
    }
    _buildPurchaseLayout(sheet, existingRows, existingNotes, existingBudgets);
    SpreadsheetApp.getUi().alert(
      `進貨記錄頁已更新格式！\n資料共 ${existingRows.length} 列，全部保留（含備註）。`
    );

  } else if (format === "old") {
    // 舊欄位式格式：自動轉換（備註移到「品項描述」欄）
    const ui      = SpreadsheetApp.getUi();
    const confirm = ui.alert(
      "偵測到舊版格式",
      "進貨記錄頁目前是「一日一列、每類別一欄」的舊格式。\n\n" +
      "系統將自動轉換成新格式（一筆進貨一列），資料與備註全部保留。\n\n" +
      "繼續？",
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) return;

    const { rows: convertedRows, notes: convertedNotes } = _convertOldPurchaseToRows(sheet);
    _buildPurchaseLayout(sheet, convertedRows, convertedNotes);
    SpreadsheetApp.getUi().alert(
      `轉換完成！\n\n原有資料已全部轉成新格式，共 ${convertedRows.length} 筆（備註保留在「品項描述」欄）。\n\n` +
      "右側「查看年份（I1）」改成你想查的年份，已花費/剩餘/使用% 會自動重算。"
    );

  } else {
    // 空白或不明格式
    _buildPurchaseLayout(sheet, []);
    SpreadsheetApp.getUi().alert("進貨記錄頁已建立！");
  }
}


// ── 重新整理進貨記錄（按日期排序，備註隨資料一起移動）───────
function refreshPurchaseSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return; // 只有標題列（row 1）或無資料

  // 讀取資料列與備註（row 2 起）
  const range    = sheet.getRange(2, 1, lastRow - 1, PURCHASE_HEADERS.length);
  const dataRows = range.getValues();
  const dataNotes = range.getNotes();

  // 合併 rows + notes，過濾出有效日期的列
  const combined = dataRows
    .map((row, i) => ({ row, note: dataNotes[i] }))
    .filter(({ row }) => {
      const dv = row[0];
      if (!dv) return false;
      const d = dv instanceof Date ? dv : new Date(dv);
      return !isNaN(d.getTime());
    });

  if (combined.length === 0) return;

  // 按日期升序排序（rows 與 notes 同步）
  combined.sort((a, b) => {
    const da = a.row[0] instanceof Date ? a.row[0] : new Date(a.row[0]);
    const db = b.row[0] instanceof Date ? b.row[0] : new Date(b.row[0]);
    return da - db;
  });

  const validRows  = combined.map(c => c.row);
  const validNotes = combined.map(c => c.note);

  // 清除舊資料與備註，寫回排序後的結果
  const clearRange = sheet.getRange(2, 1, lastRow - 1, PURCHASE_HEADERS.length);
  clearRange.clearContent();
  clearRange.clearNote();
  sheet.getRange(2, 1, validRows.length, PURCHASE_HEADERS.length).setValues(validRows);
  sheet.getRange(2, 1, validNotes.length, PURCHASE_HEADERS.length).setNotes(validNotes);
  sheet.getRange(2, P_COL_DATE,   validRows.length, 1).setNumberFormat("yyyy/MM/dd");
  sheet.getRange(2, P_COL_AMOUNT, validRows.length, 1).setNumberFormat("#,##0");
}


// ── 從進貨記錄讀取各月各類別的加總（供年度預算_GAS.gs 使用）──
// 新版格式：Row 1 = 標題, Row 2+ = 資料, D 欄 = 類別, F 欄 = 金額
function getPurchaseSummary() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const lastRow = sheet.getLastRow();
  const data    = sheet.getRange(2, 1, lastRow - 1, PURCHASE_HEADERS.length).getValues();
  const result  = {};

  data.forEach(row => {
    const dateVal  = row[P_COL_DATE   - 1]; // A
    const category = (row[P_COL_CAT   - 1] || "").toString().trim(); // D
    const amount   = parseFloat(row[P_COL_AMOUNT - 1]) || 0; // F

    if (!dateVal || !category || !amount) return;
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal.toString().replace(/\//g, "-"));
    if (isNaN(d.getTime())) return;

    const month = (d.getMonth() + 1).toString();
    if (!result[month]) result[month] = {};
    result[month][category] = (result[month][category] || 0) + amount;
  });

  return result;
}


// ════════════════════════════════════════════════════════════
// 舊資料遷移：把月份工作表裡的生豆/茶葉等搬到進貨記錄頁
// ════════════════════════════════════════════════════════════

function migrateMonthlyToPurchaseRecord() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const purchaseSheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!purchaseSheet) {
    SpreadsheetApp.getUi().alert("找不到進貨記錄頁，請先執行「初始化進貨記錄頁」");
    return;
  }

  // 確認是新格式
  const format = _detectPurchaseFormat(purchaseSheet);
  if (format !== "new") {
    SpreadsheetApp.getUi().alert(
      "進貨記錄頁格式不正確，請先執行「初始化進貨記錄頁（保留既有資料）」"
    );
    return;
  }

  // 從各月份工作表收集資料
  const newRows = [];

  MONTH_SHEETS.forEach(monthName => {
    const sheet = ss.getSheetByName(monthName);
    if (!sheet) return;

    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    const migrateCols = MIGRATE_COLS.map(name => ({
      name,
      colIdx: headers.indexOf(name), // 0-based
    })).filter(c => c.colIdx >= 0);
    if (migrateCols.length === 0) return;

    const lastRow = Math.min(sheet.getLastRow(), DATA_END_ROW + 1);
    if (lastRow < DATA_START_ROW) return;

    const srcRange = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, lastCol);
    const data     = srcRange.getValues();
    const notes    = srcRange.getNotes();

    data.forEach((row, rowIdx) => {
      const dateVal = row[0];
      if (!dateVal) return;

      let dateObj;
      if (dateVal instanceof Date) {
        dateObj = dateVal;
      } else {
        const parsed = new Date(dateVal.toString().replace(/\//g, "-"));
        if (isNaN(parsed.getTime())) return;
        dateObj = parsed;
      }

      migrateCols.forEach(col => {
        const amount = parseFloat(row[col.colIdx]) || 0;
        if (amount === 0) return;
        // 月份工作表金額欄的 cell 備註 → 新格式的「品項描述」欄
        const cellNote = (notes[rowIdx][col.colIdx] || "").toString().trim();
        // 新格式：[日期, 廠商, 品項描述, 類別, 數量/單位, 金額]
        newRows.push([dateObj, "", cellNote, col.name, "", amount]);
      });
    });
  });

  if (newRows.length === 0) {
    SpreadsheetApp.getUi().alert(
      "沒有找到任何非零資料可以遷移。\n\n" +
      "確認月份工作表有 " + MIGRATE_COLS.join("、") + " 欄位且填有金額。"
    );
    return;
  }

  const ui      = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "確認遷移",
    `即將把 ${newRows.length} 筆資料寫入「進貨記錄」頁。\n\n` +
    "原月份工作表的數字不會被刪除。\n確定繼續嗎？",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  // 寫入進貨記錄頁（追加在最後）
  const insertRow = purchaseSheet.getLastRow() + 1;
  purchaseSheet.getRange(insertRow, 1, newRows.length, PURCHASE_HEADERS.length).setValues(newRows);
  purchaseSheet.getRange(insertRow, P_COL_DATE,   newRows.length, 1).setNumberFormat("yyyy/MM/dd");
  purchaseSheet.getRange(insertRow, P_COL_AMOUNT, newRows.length, 1).setNumberFormat("#,##0");

  // 排序
  refreshPurchaseSheet();

  ui.alert(
    `遷移完成！\n\n已寫入 ${newRows.length} 筆資料到進貨記錄。\n\n` +
    "⚠️  確認資料無誤後，執行「同步所有月份欄位」\n" +
    "即可把月份工作表的生豆/茶葉/洗碗機欄位移除，避免重複計算。"
  );
}


// ════════════════════════════════════════════════════════════
// 同步年度花費到各月份（把進貨記錄頁的年預算總計÷12 寫入各月「年度花費」格）
// ════════════════════════════════════════════════════════════

function syncMonthlyFixedCost() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PURCHASE_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("找不到進貨記錄頁。");
    return;
  }

  // 讀取右側預算區：H 欄（類別）和 I 欄（年預算）
  const lastRow = sheet.getLastRow();
  if (lastRow < BUDGET_DATA_ROW) {
    SpreadsheetApp.getUi().alert("進貨記錄頁的年度預算區尚無資料。");
    return;
  }

  let totalBudget = 0;
  for (let r = BUDGET_DATA_ROW; r <= lastRow; r++) {
    const category = (sheet.getRange(r, BUDGET_START_COL).getValue() || "").toString().trim();
    if (!category || category === "合計") break;
    totalBudget += parseFloat(sheet.getRange(r, BUDGET_START_COL + 1).getValue()) || 0;
  }

  if (totalBudget === 0) {
    SpreadsheetApp.getUi().alert(
      "年度預算總計為 0，請先在進貨記錄頁右側填入各類別「年預算」金額。"
    );
    return;
  }

  const monthlyAmount = Math.round(totalBudget / 12);
  let updatedCount    = 0;

  MONTH_SHEETS.forEach(monthName => {
    const monthSheet = ss.getSheetByName(monthName);
    if (!monthSheet) return;

    const targetCell = _findCellByText(monthSheet, "年度花費");
    if (!targetCell) return;

    monthSheet.getRange(targetCell.row, targetCell.col + 1).setValue(monthlyAmount);
    updatedCount++;
  });

  SpreadsheetApp.getUi().alert(
    `同步完成！\n\n年預算總計：${totalBudget.toLocaleString()}\n` +
    `每月年度花費：${monthlyAmount.toLocaleString()}\n` +
    `已更新 ${updatedCount} 個月份。`
  );
}

function _findCellByText(sheet, text) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return null;
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (data[r][c].toString().trim() === text) return { row: r + 1, col: c + 1 };
    }
  }
  return null;
}
