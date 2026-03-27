# CreatorsCOCO 実装状況 & 今後の実装計画

最終更新：2026-03-26
ブランチ：`claude/festive-feistel`
最新コミット：`5bc5dd3` Extract BackendPanel to standalone component with Zustand store

---

## リポジトリ概要

**CreatorsCOCO** — CG集・支援サイト向けデスクトップ画像編集ツール
Electron + React + Vite + TypeScript + react-konva + Zustand
Pythonバックエンド（FastAPI）でSAM3・NudeNet連携

```
D:\Other\CreatorsCOCO\          ← リポジトリルート（main ブランチ）
D:\Other\CreatorsCOCO\.claude\worktrees\festive-feistel\   ← 作業worktree
```

---

## ファイル構成（現状）

```
src/
├── App.tsx                          (2428行 — メインレイアウト、エクスポート処理)
├── main.tsx
├── styles.css
├── components/
│   ├── KonvaCanvas.tsx              (1474行 — キャンバス描画エンジン)
│   ├── FontPicker.tsx               (274行  — フォント選択UI)
│   ├── TemplateThumb.tsx            (174行  — テンプレートサムネイル)
│   └── panels/
│       ├── BackendPanel.tsx         (1035行 — SAM3/NudeNet操作UI)
│       ├── TextLayerPanel.tsx       (133行)
│       ├── MessageWindowPanel.tsx   (74行)
│       ├── BubbleLayerPanel.tsx     (85行)
│       ├── MosaicLayerPanel.tsx     (71行)
│       ├── OverlayLayerPanel.tsx    (77行)
│       ├── WatermarkPanel.tsx       (76行)
│       ├── LayersPanel.tsx          (131行)
│       └── InspectorLayerDetails.tsx (267行)
├── stores/
│   ├── workspaceStore.ts            (6506行 — 全プロジェクト/レイヤー状態)
│   └── backendStore.ts              (237行  — バックエンドモデル/推論状態)
└── lib/
    ├── bubbleShapes.ts              (吹き出し形状生成)
    ├── api/pythonClient.ts          (185行  — FastAPIクライアント)
    └── export/
        ├── pngExporter.ts           (585行)
        ├── pdfExporter.ts           (132行)
        ├── zipExporter.ts
        ├── fileNames.ts
        └── metadata.ts

electron/
├── main.cjs                         (Electronメインプロセス)
├── preload.cjs                      (コンテキストブリッジ)
└── python-manager.cjs               (Python子プロセス管理)

python-backend/
├── main.py                          (FastAPIサーバ — 全エンドポイントがスタブ)
└── requirements.txt                 (fastapi, uvicorn, pydantic のみ)
```

---

## 実装済み機能（フェーズ1 完了分）

| 分類 | 内容 | 状態 |
|------|------|------|
| フレームワーク | Electron + React + Vite + TypeScript | ✅ |
| キャンバス | react-konva、ズーム・パン、全レイヤー種別 | ✅ |
| テキスト | 横書き・縦書き・ルビ・グラデーション・フチ取り・シャドウ・回転 | ✅ |
| 吹き出し | 5形状（丸/角丸/トゲ/もくもく/ウニ）、尻尾方向、ランダマイズ | ✅ |
| モザイク | ピクセル/ぼかし/ノイズ、矩形選択のみ | ✅（矩形のみ） |
| オーバーレイ | カラー/グラデーション、全体/上下半分/帯 | ✅ |
| ウォーターマーク | テキスト/PNG素材、タイル/シングル、角度・密度 | ✅ |
| メッセージウィンドウ | classic/soft/neon 3スタイル、話者名、サイズ変更 | ✅（9-sliceカスタムは未） |
| プロジェクト管理 | ページ管理、アンドゥ・リドゥ50ステップ、自動保存 | ✅（localStorage） |
| プリセット | テキスト/吹き出し/モザイク/オーバーレイ/ウォーターマーク | ✅ |
| テンプレート | ページからテンプレート保存・適用・複製 | ✅ |
| エクスポート | PNG/ZIP/PDF、メタデータ削除、リサイズFitMode | ✅ |
| バックエンド基盤 | Electron→FastAPI起動、SAM3/NudeNet UI全体 | ✅（Pythonはスタブ） |
| パネル分割 | 全パネルをZustandストア読み取りの独立コンポーネントへ | ✅ |

---

## 未実装・不足機能

| 分類 | 内容 | 優先度 |
|------|------|--------|
| UIスタイリング | shadcn/ui未導入。全UIが素のHTMLボタン/input | 🔴高 |
| ステータスバー | ズーム率/画像サイズ/カーソル座標 — 未実装 | 🔴高 |
| Pythonバックエンド本実装 | SAM3/NudeNet全エンドポイントがスタブ | 🔴高 |
| ページサムネイル | ページ一覧がテキストのみ。サムネイル画像なし | 🔴高 |
| テキスト背景帯 | Plan.md仕様あり。データ構造・描画とも未実装 | 🟡中 |
| メッセージウィンドウ 9-slice | カスタムPNG素材の実際の描画が未実装（フラグのみ） | 🟡中 |
| レイヤーD&Dリオーダー | LayersPanelにドラッグ並べ替えなし | 🟡中 |
| ページD&Dリオーダー | ページ一覧にドラッグ並べ替えなし | 🟡中 |
| フリーハンドモザイク | 矩形のみ。投げ縄選択は未実装 | 🟡中 |
| プロジェクト永続化 | localStorage上限問題。electron-store/SQLite未移行 | 🟡中 |
| フォントフォルダ監視 | FontPickerはあるが動的フォント追加フォルダ監視なし | 🟠低 |
| バッチ処理 | フェーズ2全般未着手 | 🟠低 |
| セリフ一括流し込み | CSV/テキストファイルからの一括配置 | 🟠低 |

---

## 今後の実装計画

### Chapter 5：UIスタイリング刷新（shadcn/ui導入）

**目的：** 素のHTML状態から実際のデザインツールらしい見た目へ

#### 5-1. shadcn/ui + Tailwind CSS導入

```bash
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
# コンポーネント追加
npx shadcn@latest add button slider select tabs accordion tooltip popover
npm install lucide-react
```

`vite.config.ts` に `@tailwindcss/vite` プラグイン追加。
`tailwind.config.ts` でダークテーマトークン設定（現行 `#14110f` 系を踏襲）。
`src/styles.css` の既存グローバルスタイルはTailwindベースレイヤーと共存させる。

#### 5-2. 共通UIコンポーネント置き換え

各パネルのHTML要素を以下に置き換え：

| 現在 | 置き換え後 |
|------|----------|
| `<button>` | `<Button variant="ghost/default/outline">` |
| `<input type="number">` | `<Slider>` + 数値inputコンボ |
| `<select>` | `<Select>` |
| `<input type="color">` | popover + カラーピッカー |
| `<input type="file">` | `<Button>` ラップのファイル選択 |
| セクション見出し | `<Accordion>` でたたみ展開 |

#### 5-3. レイアウト整理

- ツールパレット（左列）：lucide-reactアイコンのアイコンボタン化、ツールチップ追加
- 右サイドバー各パネル：`<Accordion>` で折りたたみ可能に
- BackendPanelを `<Tabs>` （Models / SAM3 / NSFW / Manual）に整理

#### 5-4. ステータスバー追加

`src/components/StatusBar.tsx` を新規作成：
- 左：`Zoom ${zoomPercent}%` / `${image.width} x ${image.height}px`
- 中：カーソルキャンバス座標（`X: 960  Y: 540`）— KonvaCanvasからonPointerMoveで取得
- 右：保存状態（`Saved at HH:MM:SS` / `Autosave pending`）

`App.tsx` のグリッドレイアウトに `<StatusBar>` を追加。

---

### Chapter 6：Pythonバックエンド本実装

**目的：** SAM3・NudeNet全エンドポイントをスタブから本実装へ

#### 6-1. `python-backend/requirements.txt` 更新

```
fastapi>=0.116,<1.0
uvicorn>=0.35,<1.0
pydantic>=2.11,<3.0
torch>=2.0
torchvision
nudenet
pillow
opencv-python
segment-anything   # SAM3
```

#### 6-2. `/api/status` — GPU検出実装

```python
import torch
gpu_available = torch.cuda.is_available()
```

#### 6-3. `/api/model/download` → SSEストリームに変更

現在はstaticレスポンスのみ。
`StreamingResponse` で `text/event-stream` を返し、進捗を `data: {"status": "downloading", "progress": 45}\n\n` 形式で配信。
フロント側の `pythonClient.ts` の `subscribeToBackendModelProgress` はSSEを想定した実装済みなのでそのまま使える。

#### 6-4. `/api/nsfw/detect` 実装

```python
from nudenet import NudeDetector
detector = NudeDetector()   # 起動時にロード（グローバル）

@app.post("/api/nsfw/detect")
def detect(request: DetectRequest):
    img = decode_base64_image(request.image_base64)
    detections = detector.detect(img)
    # detections: [{class, score, box: [x1,y1,x2,y2]}]
    return {"detections": [
        {
            "label": d["class"],
            "confidence": d["score"],
            "x": d["box"][0],
            "y": d["box"][1],
            "width": d["box"][2] - d["box"][0],
            "height": d["box"][3] - d["box"][1],
            "center_x": (d["box"][0] + d["box"][2]) / 2,
            "center_y": (d["box"][1] + d["box"][3]) / 2,
        }
        for d in detections if d["score"] >= request.threshold
    ]}
```

#### 6-5. `/api/sam3/segment` 実装

```python
from segment_anything import sam_model_registry, SamPredictor
# モデルは起動時にロード（グローバル）

@app.post("/api/sam3/segment")
def segment(request: SegmentRequest):
    img = decode_base64_image(request.image_base64)
    predictor.set_image(img)
    point_coords = [[p["x"], p["y"]] for p in request.points]
    point_labels = [p["label"] for p in request.points]
    masks, _, _ = predictor.predict(
        point_coords=np.array(point_coords),
        point_labels=np.array(point_labels),
        multimask_output=False,
    )
    # masks[0] をbase64エンコードして返す
    mask_b64 = encode_mask_base64(masks[0])
    return {"mask_base64": mask_b64, "status": "ok"}
```

#### 6-6. `/api/sam3/auto-mosaic` 実装

NudeNet検出結果からSAM3マスクを生成し、モザイク適用済み画像を返す。
- 検出バウンディングボックス中心点をSAM3ポジティブポイントとして渡す
- 各マスクにモザイク（ピクセル化/ぼかし）をOpenCV/Pillowで適用
- 適用後画像をbase64で返す

---

### Chapter 7：ページサムネイル & レイヤーD&D

**目的：** 多ページワークフローの視覚的ナビゲーション

#### 7-1. ページサムネイル生成

`src/components/PageThumb.tsx` を新規作成（`TemplateThumb` を参考）：
- Konvaオフスクリーンレンダリング → `toDataURL()` で縮小サムネイル（160×90px）
- `useEffect` でページ内容変更時にサムネイルを再生成
- `workspaceStore` に `pageThumbnails: Record<string, string>` を追加
- ページ一覧のページカードに `<img src={thumbnail}>` を表示

#### 7-2. レイヤーパネル D&Dリオーダー

`LayersPanel.tsx` に HTML5 Drag & Drop を実装：
- 各レイヤーli要素に `draggable`, `onDragStart`, `onDragOver`, `onDrop` を追加
- `workspaceStore` に `moveLayerToIndex(layerId: string, targetIndex: number)` を追加
  - 各レイヤー配列（textLayers, bubbleLayers等）を横断して対象を探しindexを変更
- ドラッグ中のli要素に `.dragging` クラスでビジュアルフィードバック

#### 7-3. ページ一覧 D&Dリオーダー

App.tsx のページ一覧カード部分にD&Dを追加：
- `workspaceStore` に `movePageToIndex(pageId: string, targetIndex: number)` を追加
  - 既存の `moveActivePageUp/Down` はそのまま残す
- ページ一覧にドラッグハンドルアイコン（`GripVertical` from lucide-react）を追加

---

### Chapter 8：残りフェーズ1機能

**目的：** Plan.md フェーズ1の未実装機能を完結させる

#### 8-1. テキスト背景帯エフェクト

**workspaceStore.ts に追加：**
```typescript
// CanvasTextLayer型に追加
backgroundBand?: {
  enabled: boolean
  color: string      // デフォルト '#000000'
  opacity: number    // 0.0〜1.0、デフォルト 0.6
  paddingX: number   // 横パディング px
  paddingY: number   // 縦パディング px
}

// アクション追加
setSelectedTextLayerBackgroundBand: (band: CanvasTextLayer['backgroundBand']) => void
```

**KonvaCanvas.tsx の描画関数に追加：**
テキスト描画の直前にCanvasコンテキストで矩形を描画。
テキストのバウンディングボックスを測定 → `fillStyle` + `globalAlpha` で塗りつぶし。

**TextLayerPanel.tsx に追加：**
背景帯のON/OFF トグル、色ピッカー、不透明度スライダー、パディング入力。

#### 8-2. メッセージウィンドウ カスタムPNG 9-slice描画

**workspaceStore.ts を更新：**
```typescript
// CanvasMessageWindowLayer型に追加
assetDataUrl: string | null   // base64 data URL

// loadSelectedMessageWindowAsset を更新
// File → FileReader → dataURL → store に保存
```

**KonvaCanvas.tsx の `drawMessageWindow` 関数を更新：**
`assetDataUrl` がある場合、9-sliceレンダリングを行う：
- 元画像を3×3に分割（各コーナーサイズはデフォルト32px）
- Canvas 2Dの `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` で9枚描画
- コーナー（固定）、辺（引き伸ばし）、中央（引き伸ばし）

#### 8-3. フリーハンドモザイク（投げ縄選択）

**workspaceStore.ts を更新：**
```typescript
// CanvasMosaicLayer型に追加
shape: 'rect' | 'freehand'
path?: Array<{ x: number; y: number }>   // freehandの場合のポイント列

// 新アクション
addFreehandMosaicLayer: (path: Array<{x: number; y: number}>, style: MosaicStyle, intensity: number) => void
```

**KonvaCanvas.tsx を更新：**
- `activeTool === 'freehand-mosaic'` の時、PointerDown→Move→Upでパスを収集
- パス確定時に `addFreehandMosaicLayer` を呼ぶ
- Konva.Line（closeShape=true）でパスのビジュアルフィードバック表示
- レンダリング時：Konvaのクリッピングパスで切り抜きながらモザイクエフェクト適用

**pngExporter.ts を更新：**
- freehandシェイプのモザイクレイヤーは `ctx.clip()` でパスクリッピング後にエフェクト適用

#### 8-4. プロジェクト永続化 → electron-store移行

```bash
npm install electron-store
```

**electron/main.cjs を更新：**
```javascript
const Store = require('electron-store')
const store = new Store()
ipcMain.handle('project:save', (_, data) => store.set('project', data))
ipcMain.handle('project:load', () => store.get('project'))
ipcMain.handle('recent-projects:save', (_, data) => store.set('recentProjects', data))
ipcMain.handle('recent-projects:load', () => store.get('recentProjects', []))
```

**electron/preload.cjs を更新：**
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  loadProject: () => ipcRenderer.invoke('project:load'),
  saveRecentProjects: (data) => ipcRenderer.invoke('recent-projects:save', data),
  loadRecentProjects: () => ipcRenderer.invoke('recent-projects:load'),
})
```

**workspaceStore.ts を更新：**
- `saveNow()` 内：`window.electronAPI?.saveProject(data) ?? localStorage.setItem(...)` でフォールバック対応
- `restoreSavedProject()` 内：同様にIPCを優先、なければlocalStorage

---

### Chapter 9：フェーズ2 効率化機能

**目的：** 大量ページの繰り返し作業を自動化

#### 9-1. バッチテンプレート適用

`workspaceStore.ts` に追加：
```typescript
applyTemplateToSelectedPages: (templateId: string, pageIds: string[]) => void
```

App.tsx またはモーダルコンポーネントに「全ページに適用」/「選択ページに適用」ダイアログ追加。
チェックボックス付きページ選択UI。

#### 9-2. バッチSAM3モザイク

`BackendPanel.tsx` に「全ページ一括処理」セクションを追加：
- ページ一覧を表示（チェックボックスで対象選択）
- 「一括実行」ボタン → 選択ページを順次 `runNsfwDetection` + `runSam3AutoMosaic` → 結果を各ページに適用
- 進捗表示：`処理中: 3 / 12ページ`
- キャンセル対応（`AbortController`）

#### 9-3. セリフ一括流し込み（CSV）

`src/components/CsvImportDialog.tsx` を新規作成：
- CSVファイル選択
- ヘッダー行のフィールドをレイヤー名にマッピング（`speaker` → 話者、`body` → 本文）
- 1行 = 1ページとしてテキストレイヤーを一括更新
- プレビュー付き確認ダイアログ

`workspaceStore.ts` に追加：
```typescript
importDialogueFromCsv: (rows: Record<string, string>[], fieldMap: Record<string, string>) => void
```

---

## 推奨実装順

```
Chapter 5（UIスタイリング刷新）
    ↓ 見た目が整い、以降の開発・確認がしやすくなる
Chapter 7（ページサムネイル + レイヤーD&D）
    ↓ 多ページ作業の操作性が大幅向上
Chapter 8（残フェーズ1機能完結）
    ├── 8-1 テキスト背景帯（小）
    ├── 8-2 9-sliceウィンドウ（中）
    ├── 8-3 フリーハンドモザイク（中）
    └── 8-4 electron-store移行（インフラ）
Chapter 6（Pythonバックエンド本実装）
    ↓ バックエンド機能が実際に動く
Chapter 9（フェーズ2 効率化）
```

Chapter 5 と Chapter 7 は依存関係がなく並行実装可能。

---

## 技術的注意点

### KonvaCanvasの描画パターン
- カスタムテキスト/メッセージウィンドウ描画はすべて `useEffect` 内でCanvas 2Dコンテキストに描画し `Konva.Image` として表示
- パフォーマンス最適化：`useRef` でCanvasキャッシュ、依存変数変化時のみ再描画

### workspaceStore の更新パターン
- 全アクションはイミュータブル更新（スプレッド演算子）
- アンドゥ対象のアクションは `pushToUndoStack(state)` を更新の直前に呼ぶ
- セレクタは `selectActiveImage({ pages, activePageId })` を経由する

### backendStoreとworkspaceStoreの境界
- バックエンド推論結果（SAM3候補、NSFW検出）は `backendStore` 管理
- キャンバスに適用済みのレイヤーは `workspaceStore` 管理
- BackendPanel → `addBackendMosaicLayers` / `addBackendOverlayLayers` で workspaceStore に橋渡し

### electron-store移行時の後方互換
- localStorage に保存済みデータがある場合はマイグレーションが必要
- `restoreSavedProject` で `electronAPI` がなければ localStorage にフォールバックすることで、ブラウザ開発モード（`npm run dev`の Vite単体起動）でも動作を維持する

---

## ビルド・起動方法

```bash
# 開発（Vite + Electron 同時起動）
npm run dev

# Viteビルドのみ（ビルド確認）
export PATH="/c/Program Files/nodejs:$PATH"
node node_modules/vite/bin/vite.js build

# テスト
node node_modules/vite/bin/vitest.js run
```

Node.js は `C:\Program Files\nodejs\node.exe` に存在。
`npx` は Git Bash では動作しないため `node node_modules/.bin/vite` 形式で実行。
（`node_modules/.bin/vite` はシェルスクリプトなので `node node_modules/vite/bin/vite.js` を使う）
