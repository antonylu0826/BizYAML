# BizYAML 開發任務清單 (Phase 2)

## 1. Monorepo 基礎建設 (Infrastructure)
- [x] 初始化 Root `package.json` 與 `npm` Workspaces
- [x] 建立共享的 TypeScript TypeScript (`tsconfig.base.json`)
- [x] 安裝全域開發依賴 (TypeScript, tsup, rimraf)

## 2. 定義子套件結構 (Package Scaffolding)
- [x] 初始化 `@bizyaml/parser` 套件目錄
    - 安裝相依：`zod`, `yaml`, `zod-to-json-schema`
- [x] 初始化 `@bizyaml/cli` 套件目錄
    - 安裝相依：`cac`, `@bizyaml/parser` 連結
- [x] 初始化 `@bizyaml/schema` 套件目錄
    - 用於放置編譯產出的 `schema.json`

## 3. Zod 驗證核心開發 (SSOT)
- [x] 定義 `Entity` Schema
- [x] 定義 `Workflow` Schema
- [x] 定義 `Views` Schema
- [x] 撰寫轉換腳本，自動匯出 JSON Schema 供 VSCode 使用

## 4. Parser 檔案合併與去糖器
- [x] 實作讀取目錄 YAML 檔案的功能 (`Discovery`)
- [x] 實作檔案內容解析與合併 (`Merge`)
- [x] 將縮寫語法 `!` 等展開 (`Desugar`)
- [x] 產出最終 IR JSON (`Compile`)

## 5. CLI 工具與驗證腳本
- [x] 實作 `bizyaml compile ./target` 命令
- [x] 透過 `07_Complete_Example.md` 中的 `PurchaseOrder` 範例進行 PoC 跑通驗證
