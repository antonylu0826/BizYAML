# BizYAML

> **最新版本**: v1.0 Draft
> **設計哲學**: 約定優於配置 (Convention over Configuration)，致力於消滅冗餘的重工，打造領域專家與開發者的完美中介語言。

由於 BizYAML 所涵蓋的商業領域邏輯龐大，我們已將本規範書拆分為模組化的獨立子文件，敬請參閱下列索引目錄以深入各項細節：

## 📓 規範目錄索引 (Index)

### [1. 架構總覽與哲學 (Architecture)](docs/01_Architecture.md)
* 探索 BizYAML 的核心哲學。
* 了解如何透過「資料夾對應模組」與「副檔名（`.entity.yaml`, `.flow.yaml`, `.views.yaml`）切分職責」來對付龐大的企業專案。

### [2. 資料模型層 (Data Modeling Layer)](docs/02_Data_Modeling.md)
* 定義實體 (Entity) 的核心：欄位設定與語法糖。
* 特殊機制：處理自動流水號編碼與虛擬查表映射 (Lookup)。
* 關係與維度：最優雅的關聯 (Relations) 宣告法（含一對多、多對一以及自己關聯自己的 Tree 結構）。

### [3. 商業邏輯層 (Business Logic Layer)](docs/03_Business_Logic.md)
* 利用 `eval` 區塊打造防呆與動態隱藏/必填條件。
* 防呆神器：跨欄位驗證設定 (Validations)。
* 建立堅若磐石的狀態機 (State Machine) 與守衛條件 (`guard`) 引擎。
* 非同步對接外部系統的 Webhook 掛載解法，含重試策略。

### [4. 展現層與多語系 (Presentation & I18n)](docs/04_Presentation.md)
* 如何利用 `views` 直接幫前端畫好清單與主從表單 (Master-Detail) 的骨架佈局 (Layout, Tabs)。
* 無侵入式的字典鍵值推測邏輯：乾淨俐落地對接任何多語系函式庫。

### [5. 核心保留字辭典 (Reserved Words)](docs/05_Reserved_Words.md)
* **解析器最佳指南**：嚴格列舉 BizYAML 所有層級的專用系統保留字。
* 不斷膨脹的專案也無須懼怕命名衝突，撰寫 Linter 與 VSCode JSON Schema 時的黃金準則。
* 模板語法對照表：`{...}` 與 `${...}` 的適用範圍與差異。

### [6. 表達式語言規範 (Expression Language)](docs/06_Expression_Language.md)
* 定義 `computed`、`eval`、`validations`、`guard` 等區塊共用的最小表達式子集。
* 運算子（含 `in`/`not in` 集合運算子）、字面值類型、內建函式完整清單。
* 各區塊的使用限制摘要與 Parser 實作注意事項。

### [7. 完整實戰範例 (Complete Example)](docs/07_Complete_Example.md)
* 以「採購單 (PurchaseOrder)」為題，展示完整的 `.entity.yaml` + `.flow.yaml` + `.views.yaml` 三檔拆分範例。
* 涵蓋流水號、狀態機、多層佈局、Master-Detail、Hooks 等所有核心功能的實際寫法。
* 附帶解析器最終產出的 IR JSON 示意與 I18n 提取結果。

---

## 🚀 軟體工程元件定位與藍圖 (Component Roadmap)

**BizYAML 是一個專注於「意圖抽象 (Intent Abstraction)」的軟體工程核心元件**
主要想提供最穩固的規範與解析基盤，讓開發團隊能輕易將其嵌入任何現有架構中作為單一真實來源 (SSOT)。

接下來的發展藍圖嚴格依循「先求防呆檢查，再建核心編譯，最後開放延伸生態」的節奏：

### 🏁 Phase 1: 規格確立與共識 (Specification & Standard)
- [x] **完成規格定義**：完善 `docs/*` 系列文件，確保 `.entity`, `.flow`, `.views` 的資料結構邊界與保留字不再模糊。
- [x] **建立 AI 協作基準**：將本規範書標準化為 AI Coding Agent 的 System Prompt，確保人工或 AI 產出都具備 100% 的規格一致性。

### ⚙️ Phase 2: 核心解析引擎與開發工具 (Core Parser & DX)
*Parser 是唯一的真實來源：所有驗證邏輯、JSON Schema、CLI 全部從 Parser 派生，不重複維護兩套規則。*
- [x] **開發 `@bizyaml/parser`**：實作輕量且零依賴的 TypeScript 編譯模組，負責 Discovery、Merge、Desugar、語義驗證，最終吐出標準化 JSON IR，作為所有下游工具的唯一標準入口。
- [x] **開發 `@bizyaml/cli`**：Parser 的 thin wrapper，提供 `bizyaml validate`（含語義層深度檢查）、`bizyaml compile`（輸出 IR JSON）等指令，供開發人員與 CI/CD 流程整合。
- [x] **發布 `@bizyaml/schema`**：由 Parser 的保留字定義自動衍生的 JSON Schema，掛載至 IDE 後提供欄位自動補齊與結構防呆提示。

### 🔌 Phase 3: 適配器開放生態 (Adapters Ecosystem)
*產出標準 IR 後，由外部專案或開源社群自行開發適合自己的轉換器：*
- [ ] **ORM 適配器 (DB Generators)**：例如 `bizyaml-prisma-adapter` 讀取 IR 後自動吐出 `schema.prisma`。
- [ ] **動態表單渲染 (UI Renderers)**：例如 `bizyaml-vue-renderer` 直接讀取 IR，利用資料綁定動態生出 CRUD 元件。
- [ ] **多語系提取器 (I18n Extractor)**：自動遍歷 IR 抽出所有 `label` 與 `message`，生成預設翻譯檔。
