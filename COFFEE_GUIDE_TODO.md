# Coffee Guide 待辦任務

## 任務一：新增「品種比較」功能

### 目標
在 `app/coffee-guide/CoffeeGuideClient.tsx` 加入多品種比較模式：
使用者可勾選最多 4 個品種，側欄底部出現「比較」按鈕，點擊後展開一個並排的雷達圖面板。

### 具體需求

**1. 資料層（`CoffeeGuideClient.tsx`）**
- 新增 state：`compareIds: string[]`（最多 4 個）
- 新增 toggle 函式：`toggleCompare(id: string)`
  - 若 id 已在 compareIds → 移除
  - 若 compareIds.length < 4 → 加入
  - 若已滿 4 個 → 不做事，顯示提示

**2. 氣泡圖上的變化**
- 每個氣泡左上角加一個小圓形 checkbox（直徑 14px）
- 當該品種在 compareIds 中時，checkbox 顯示打勾 ✓，並在氣泡外圈加白色描邊
- Hover 時 checkbox 變亮

**3. 左側 Sidebar 底部**
- 固定在 sidebar 最下方，顯示：
  ```
  已選 {compareIds.length} / 4 個品種
  [比較所選品種] 按鈕（compareIds.length >= 2 才可點擊）
  [清除] 文字按鈕
  ```

**4. 比較面板（ComparePanel）**
- 當 `showCompare === true` 時，在主畫面下方展開一個面板（高度約 320px，可關閉）
- 面板內容：並排顯示所選品種的雷達圖（最多 4 個，flex-wrap）
- 每張雷達圖下方顯示：品種名、英文名、最強的 3 個風味標籤
- 右上角有 ✕ 關閉按鈕
- 面板同樣支援 vendor / user 模式切換（跟隨全局 mode state）

**5. 疊加比較雷達圖（選做，如果上面做完有餘力）**
- 比較面板右側加一個「疊加顯示」的 SVG：把所選品種全部畫在同一張雷達圖上，用不同顏色區分
- 顏色取 `CATEGORY_COLORS[v.category]`

---

## 任務二：修正風味資料來源

### 目標
`app/coffee-guide/data.ts` 的風味分數目前混合了 AI 生成與網路摘要，需要替換成可追溯的公開資料。

### 資料來源優先順序（可信度高到低）
1. **WCR Variety Catalog**（worldcoffeeresearch.org/varieties）：提供官方感官描述
2. **SCA Cup of Excellence 歷年資料**：針對特定品種的杯測評分
3. **CoffeeReview.com**：商業評測數值（acidity, body, flavor, aftertaste 各 0–100）

### 需要修正的欄位
請針對以下品種重新查驗 `vendor` 分數是否符合 WCR / SCA 公開資料，並更新 `vendorNotes`（改為引用原文片段，加上來源標注）：

| 品種 id | 重點確認項目 |
|---|---|
| `gesha` | 花香、果香分數應最高，WCR 標注為 "exceptional floral" |
| `sl28` | 酸度應偏高（8+），WCR 標注為 "blackcurrant, grapefruit" |
| `bourbon` | 甜度應高於鐵比卡，WCR 標注為 "sweet, balanced" |
| `catimor` | 羅布斯塔血統，苦度/醇厚應高，花香低 |
| `laurina` | 低咖啡因、低苦度是關鍵特徵，要確認 chocolate 分數不要高估 |

### 更新格式
每筆 `vendorNotes` 改為：
```ts
vendorNotes: [
  "花香（WCR: jasmine, bergamot）",
  "熱帶水果（WCR: tropical fruit）",
  "…",
],
```

### 同步更新 `userNotes`
`userNotes` 目前部分為空或過短。請補充來自 r/Coffee、Home-Barista.com 的實際討論摘要（繁體中文意譯），每筆至少 2 條，每條 15–40 字。

---

## 執行順序建議

1. 先做「任務一」，確保比較功能可用
2. 再做「任務二」，逐品種更新資料
3. 任務一完成後，執行 `npm run dev` 確認畫面正常，無 TypeScript 錯誤

## 檔案範圍

- 主要修改：`app/coffee-guide/CoffeeGuideClient.tsx`
- 資料修改：`app/coffee-guide/data.ts`
- 不需要修改：`app/coffee-guide/page.tsx`（保持不動）
