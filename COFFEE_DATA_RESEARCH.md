# 任務：重新蒐集咖啡品種風味資料

## 背景說明

`app/coffee-guide/data.ts` 目前的風味分數（acidity、floral、fruity 等）是 AI 推斷產生的，
不是來自可追溯的原始來源，導致部分品種的 `category` 分類與實際風味特徵不符。

本任務要求你**自行搜尋可信來源**，重新核對並更新每個品種的資料。

---

## 執行步驟

### Step 1：確認可信來源清單

請先用 WebSearch 確認以下網站目前是否可存取，並記下你成功讀取到資料的網站：

1. `https://varieties.worldcoffeeresearch.org` — WCR Variety Catalog（最高優先）
2. `https://www.coffeereview.com` — CoffeeReview（有數值評分）
3. `https://perfectdailygrind.com` — Perfect Daily Grind（產業文章）
4. `https://en.wikipedia.org/wiki/List_of_Coffea_arabica_cultivars` — 品種血統查核用

對每個可存取的網站，記錄：
- 它提供哪種格式的資料（質化描述 / 數值評分 / 兩者都有）
- 它能覆蓋哪些品種

---

### Step 2：逐品種蒐集資料

針對 `data.ts` 裡的 **36 個品種**，依以下優先順序查詢：

**主要來源（優先）：WCR Variety Catalog**
- 網址格式：`https://varieties.worldcoffeeresearch.org/varieties/{品種英文名小寫}`
- 例如 gesha → `https://varieties.worldcoffeeresearch.org/varieties/gesha`
- 從頁面擷取：Sensory Profile（flavor descriptors）、Agronomic traits

**補充來源：CoffeeReview**
- 搜尋格式：`site:coffeereview.com "{品種英文名}" variety`
- 擷取：Aroma、Acidity、Body 的質化描述詞（bright / delicate / full / etc.）

**對於 WCR 查不到的品種**（例如較新的商業品種）：
- 搜尋：`"{品種英文名}" coffee variety flavor profile site:perfectdailygrind.com OR site:sca.coffee`
- 記錄找到的來源 URL

---

### Step 3：建立對照表

查完後，在 `app/coffee-guide/data-sources.json` 建立一份對照表，格式如下：

```json
{
  "gesha": {
    "sources": [
      {
        "url": "https://varieties.worldcoffeeresearch.org/varieties/gesha",
        "retrieved": "2026-04-15",
        "raw_descriptors": ["jasmine", "bergamot", "tropical fruit", "peach"],
        "acidity_desc": "very high",
        "body_desc": "light to medium",
        "confidence": "high"
      }
    ],
    "proposed_scores": {
      "acidity": 8.5,
      "body": 4.5,
      "sweetness": 8.0,
      "floral": 9.5,
      "fruity": 8.5,
      "chocolate": 1.5
    },
    "proposed_category": "floral",
    "notes": "WCR 明確標示 floral 為主導，fruit 為輔"
  }
}
```

`confidence` 欄位填入：
- `"high"` — 直接從 WCR 或 SCA 官方頁面讀取
- `"medium"` — 來自 PerfectDailyGrind 等產業媒體
- `"low"` — 只找到論壇討論或間接描述

---

### Step 4：分數換算規則

WCR 使用質化描述，請依以下規則換算成 1–10 分：

| WCR 描述 | 換算分數 |
|---|---|
| very high / exceptional | 9–10 |
| high | 7.5–8.5 |
| medium-high | 6.5–7.5 |
| medium | 5–6.5 |
| low-medium | 3.5–5 |
| low / none | 1–3.5 |

`category` 欄位的判斷邏輯：
- floral ≥ 8 且 floral > fruity → `"floral"`
- fruity ≥ 8 且 fruity ≥ floral → `"fruity"`
- chocolate ≥ 7 且 acidity ≤ 6 → `"chocolate"`
- body ≥ 8 且 acidity ≤ 5 → `"bold"`
- sweetness ≥ 8 且其他指標均衡 → `"sweet"`
- 其他 → `"balanced"`

---

### Step 5：更新 data.ts

對照 `data-sources.json`，更新 `app/coffee-guide/data.ts` 中每個品種的：

1. `vendor` 分數 → 替換為 Step 4 換算後的數值
2. `category` → 依 Step 4 邏輯重新判斷
3. `vendorNotes` → 改為從原始來源擷取的英文描述詞（翻譯成中文），格式：
   ```
   "茉莉花香（WCR: jasmine）"
   ```
4. `lineage` → 如有 WCR 更精確的血統描述，一併更新

**不要動的欄位：** `id`、`name`、`nameEn`、`origins`

---

### Step 5b：蒐集 userNotes（真實用戶感想）

`userNotes` 目前也是 AI 推斷產生的，需要替換成真實的社群討論內容。

#### 使用 Reddit 公開 JSON API

Reddit 每個搜尋頁面都可以加 `.json` 取得結構化資料，**不需要 API key 或登入**。

針對每個品種，執行以下兩個請求：

**搜尋討論串（r/Coffee）：**
```
https://www.reddit.com/r/Coffee/search.json?q={品種英文名}+flavor+variety&restrict_sr=1&sort=relevance&limit=25
```

**搜尋 r/espresso：**
```
https://www.reddit.com/r/espresso/search.json?q={品種英文名}+flavor&restrict_sr=1&sort=relevance&limit=25
```

**熱門討論串的留言（針對高知名度品種如 gesha、sl28、bourbon）：**

對搜尋結果中按讚數最高的前 3 篇，額外抓取完整留言：
```
https://www.reddit.com/r/Coffee/comments/{post_id}.json?limit=50
```
從留言的 `body` 欄位中篩選含風味關鍵字的回覆，補充進 userNotes。

請求時加上 User-Agent header，避免被擋：
```
User-Agent: coffee-guide-research/1.0
```

從回傳的 JSON 中，擷取每筆結果的 `data.children[].data` 裡的 `title` 和 `selftext`，找出包含風味描述的句子（含 flavor、taste、notes、acidity、floral、fruity 等關鍵字）。

#### 整理格式

每個品種的 `userNotes` 更新為 2–4 條，每條：
- 15–50 字的繁體中文意譯
- 括號內附來源，格式：`（r/Coffee）` 或 `（r/espresso）`
- 找不到足夠資料的品種，標記 `(待補充)` 保留原值

範例：
```ts
userNotes: [
  "冷卻後花香更明顯，像在喝花茶而不是咖啡（r/Coffee）",
  "好的批次有覆盆子配百香果的層次，但貴得要命（r/espresso）",
  "有人說改變了對咖啡的認知，有人說不值那個價（r/Coffee）",
]
```

#### 補充來源：Home-Barista.com（如已安裝 Tavily MCP）

如果有 Tavily 可用，對查不到 Reddit 內容的品種，補充搜尋：
```
tavily_search: "{品種英文名}" site:home-barista.com flavor
```

---

### Step 6：產出修改摘要

完成後，在終端機輸出一份摘要，列出：

```
已更新品種（confidence: high）：gesha、sl28、bourbon、...
需人工確認（confidence: medium/low）：catimor、...
WCR 查無資料，維持原值：...
```

---

## 注意事項

- 如果某個網站回傳 403 或查不到，**不要放棄**，改用 WebSearch 搜尋 `"{品種名}" WCR variety catalog flavor`
- 每次 fetch 後等待確認有拿到內容再繼續，不要連續發出大量請求
- 分數不要憑印象填，**沒有找到來源就填 null 並標記 confidence: "none"**
- 最終 data.ts 裡的數值若是 null 需改為合理預設值（5.0），並在 data-sources.json 標記

---

## 執行指令

```
請閱讀 COFFEE_DATA_RESEARCH.md 並開始執行，從 Step 1 確認來源開始。
每完成一個 Step 告訴我進度再繼續。
```
