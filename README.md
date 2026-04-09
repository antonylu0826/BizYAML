# BizYAML 規範書 (BizYAML Specification)

> **最新版本**: v1.0 Draft
> **設計哲學**: 約定優於配置 (Convention over Configuration)，致力於消滅冗餘的重工，打造領域專家與開發者的完美中介語言。

由於 BizYAML 所涵蓋的商業領域邏輯龐大，我們已將本規範書拆分為模組化的獨立子文件，敬請參閱下列索引目錄以深入各項細節：

## 📓 規範目錄索引 (Index)

### [1. 架構總覽與哲學 (Architecture)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/01_Architecture.md)
* 探索 BizYAML 的核心哲學。
* 了解如何透過「資料夾對應模組」與「副檔名（`.entity.yaml`, `.flow.yaml`, `.views.yaml`）切分職責」來對付龐大的企業專案。

### [2. 資料模型層 (Data Modeling Layer)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/02_Data_Modeling.md)
* 定義實體 (Entity) 的核心：欄位設定與語法糖。
* 特殊機制：處理自動流水號編碼與虛擬查表映射 (Lookup)。
* 關係與維度：最優雅的關聯 (Relations) 宣告法（含一對多、多對一以及自己關聯自己的 Tree 結構）。

### [3. 商業邏輯層 (Business Logic Layer)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/03_Business_Logic.md)
* 利用 `eval` 區塊打造防呆與動態隱藏/必填條件。
* 防呆神器：跨欄位驗證設定 (Validations)。
* 建立堅若磐石的狀態機 (State Machine) 與守衛條件 (`guard`) 引擎。
* 非同步對接外部系統的 Webhook 掛載解法，含重試策略。

### [4. 展現層與多語系 (Presentation & I18n)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/04_Presentation.md)
* 如何利用 `views` 直接幫前端畫好清單與主從表單 (Master-Detail) 的骨架佈局 (Layout, Tabs)。
* 無侵入式的字典鍵值推測邏輯：乾淨俐落地對接任何多語系函式庫。

### [5. 核心保留字辭典 (Reserved Words)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/05_Reserved_Words.md)
* **解析器最佳指南**：嚴格列舉 BizYAML 所有層級的專用系統保留字。
* 不斷膨脹的專案也無須懼怕命名衝突，撰寫 Linter 與 VSCode JSON Schema 時的黃金準則。
* 模板語法對照表：`{...}` 與 `${...}` 的適用範圍與差異。

### [6. 表達式語言規範 (Expression Language)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/06_Expression_Language.md)
* 定義 `computed`、`eval`、`validations`、`guard` 等區塊共用的最小表達式子集。
* 運算子（含 `in`/`not in` 集合運算子）、字面值類型、內建函式完整清單。
* 各區塊的使用限制摘要與 Parser 實作注意事項。

### [7. 完整實戰範例 (Complete Example)](file:///c:/Users/Anthony.MAXECHO/Desktop/BizYAML/docs/07_Complete_Example.md)
* 以「採購單 (PurchaseOrder)」為題，展示完整的 `.entity.yaml` + `.flow.yaml` + `.views.yaml` 三檔拆分範例。
* 涵蓋流水號、狀態機、多層佈局、Master-Detail、Hooks 等所有核心功能的實際寫法。
* 附帶解析器最終產出的 IR JSON 示意與 I18n 提取結果。

---

## 🛠 未來生態系與可銜接元件 (Ecosystem & Integrations)

BizYAML 被設計為一套純粹的「意圖描述語言 (Intent DSL)」，它本身並不執行任何資料庫操作或前端渲染。它的價值在於作為核心樞紐，驅動周邊強大的軟體生態系元件。BizYAML **不綁定任何特定的程式語言、框架或外部平台**，以下列舉的均為可能的整合方向，而非唯一選擇。

### 1. 開發者工具與編輯器 (IDEs & Editors)
基於本規範的「保留字辭典」，我們可以輕易打造出：
* **JSON Schema 定義檔**：讓各類編輯器（VS Code、JetBrains 等）具備強大的 Auto-complete (自動補齊) 與防呆提示。
* **Syntax Highlighter 與 Linter**：在編寫 YAML 時即時畫出紅線，預防非法的動態表達式或保留字衝突。
* **AI Agent 整合**：將 BizYAML 規範作為 Context 提供給 AI Coding Agent，讓 AI 直接根據需求描述生成符合規範的 `.entity.yaml`、`.flow.yaml`，或反向分析既有 YAML 並提出優化建議。
* **CLI 工具**：提供 `bizyaml validate`（語法驗證）、`bizyaml generate`（程式碼生成）、`bizyaml diff`（Schema 變更比對）等指令，整合進 CI/CD 流程。
* **低程式碼視覺化編輯器 (Visual Editor)**：讓非技術人員 (PM/領域專家) 透過拖拉介面設定流程，底層自動產出 BizYAML 供版本控制。

### 2. 多語言解析器 (Code Generators & Parsers)
由於框架無關 (Framework-Agnostic) 的特性，BizYAML 可以被編譯到任何後端語言與 ORM。解析器開發者只需依照本規範書實作，即可將 `.entity.yaml` 轉換為目標平台的資料模型定義、將 `.flow.yaml` 中的狀態機載入目標平台的工作流引擎。

### 3. 動態前端中後台引擎 (Dynamic Admin UI)
結合 `.views.yaml` 的排版宣告，能打造出基於任何前端框架的動態渲染引擎。前端完全不需要寫死 HTML 表格，只需讀取編譯後的 JSON，即可瞬間生成出完整的 CRUD 介面、過濾器 (Filter) 以及主從資料表 (Master-Detail)。

### 4. 自動化工作流整合 (Workflow Automation)
透過 `.flow.yaml` 中的 `hooks` 設定，BizYAML 天生具備極強的外掛能力：當系統狀態發生轉換時，後端服務依宣告發送 Webhook 至任何支援標準 HTTP 協議的自動化平台，由外部平台負責複合型的後續動作。實現「業務邏輯歸系統，自動化任務歸外部」的完美切分。
