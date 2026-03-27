# CreatorsCOCO 実装状況 & 今後の実装計画

最終更新：2026-03-27
ブランチ：`main`
最新コミット：`cf32c1f` Update package-lock.json to v1.1.0 and add IMPLEMENTATION_STATUS.md

---

## リポジトリ概要

**CreatorsCOCO** — CG集・支援サイト向けデスクトップ画像編集ツール
Electron + React + Vite + TypeScript + react-konva + Zustand
Pythonバックエンド（FastAPI）でSAM3・NudeNet連携

---

## ファイル構成（現状）

```
src/
├── App.tsx                          (1264行 メインレイアウト)
├── main.tsx
├── styles.css
├── components/
│   ├── KonvaCanvas.tsx
│   ├── FontPicker.tsx
│   ├── TemplateThumb.tsx
│   ├── PageThumb.tsx
│   ├── CsvImportDialog.tsx
│   ├── StatusBar.tsx
│   └── panels/
│       ├── BackendPanel.tsx
│       ├── PresetLibraryPanel.tsx
│       ├── ExportSettingsPanel.tsx
│       ├── TextLayerPanel.tsx
│       ├── MessageWindowPanel.tsx
│       ├── BubbleLayerPanel.tsx
│       ├── MosaicLayerPanel.tsx
│       ├── OverlayLayerPanel.tsx
│       ├── WatermarkPanel.tsx
│       ├── LayersPanel.tsx
│       └── InspectorLayerDetails.tsx
├── stores/
│   ├── workspaceStore.ts
│   └── backendStore.ts
└── lib/
    ├── bubbleShapes.ts
    ├── api/pythonClient.ts
    └── export/
        ├── pngExporter.ts
        ├── pdfExporter.ts
        ├── zipExporter.ts
        ├── fileNames.ts
        └── metadata.ts

electron/
├── main.cjs         (fs-based JSON store)
├── preload.cjs
└── python-manager.cjs

python-backend/
├── main.py          (FastAPIサーバ — 全エンドポイントがスタブ)
└── requirements.txt
```

---

## 実装済み機能

| 分類 | 内容 | 状態 |
|------|------|------|
| フレームワーク | Electron + React + Vite + TypeScript | OK |
| キャンバス | react-konva、ズーム・パン、全レイヤー種別 | OK |
| テキスト | 横書き・縦書き・ルビ・グラデーション・フチ取り・シャドウ・回転・背景帯 | OK |
| 吹き出し | 5形状（丸/角丸/トゲ/もくもく/ウニ）、尻尾方向、ランダマイズ | OK |
| モザイク | ピクセル/ぼかし/ノイズ、矩形・フリーハンド選択、Pixivモザイク | OK |
| オーバーレイ | カラー/グラデーション、全体/上下半分/帯 | OK |
| ウォーターマーク | テキスト/PNG素材、タイル/シングル、角度・密度 | OK |
| メッセージウィンドウ | classic/soft/neon + カスタムPNG 9-slice | OK |
| プロジェクト管理 | ページ管理、アンドゥ・リドゥ50ステップ、自動保存 | OK |
| プロジェクト永続化 | Electronネイティブ（fs-based JSON store）、ブラウザはlocalStorage | OK |
| プリセット | テキスト/吹き出し/モザイク/オーバーレイ/ウォーターマーク | OK |
| テンプレート | 保存・適用・複製、バッチ適用 | OK |
| エクスポート | PNG/ZIP/PDF、SNSプリセット、メタデータ削除、リサイズFitMode | OK |
| バックエンド基盤 | Electron→FastAPI起動、SAM3/NudeNet UI全体 | OK（Pythonはスタブ） |
| パネル分割 | 全パネルをZustandストア読み取りの独立コンポーネントへ | OK |
| UIスタイリング | shadcn/ui + Tailwind CSS、lucide-reactアイコン | OK |
| ステータスバー | ズーム率/画像サイズ/カーソル座標/保存状態 | OK |
| ページサムネイル | ページ一覧にKonvaオフスクリーンサムネイル表示 | OK |
| D&Dリオーダー | レイヤーパネル・ページ一覧のドラッグ並べ替え | OK |
| キーボードショートカット | Ctrl+Z/Y、Delete、Ctrl+G/H、Ctrl+上下 等 | OK |
| バッチ処理 | テンプレート一括適用、SAM3一括モザイク、CSV一括流し込み | OK |

---

## 未実装・不足機能

| 分類 | 内容 | 優先度 |
|------|------|--------|
| Pythonバックエンド本実装 | SAM3/NudeNet全エンドポイントがスタブ | 高 |
| UI/UX全面改善 | 視認性・操作性・学習コストの面で実利用レベルに未達 | 高 |
| フォントフォルダ監視 | FontPickerはあるが動的フォント追加フォルダ監視なし | 低 |

---

## 今後の実装計画

### Chapter 11：Pythonバックエンド本実装

**目的：** SAM3・NudeNet全エンドポイントをスタブから本実装へ

#### 11-1. requirements.txt 更新

```
fastapi>=0.116,<1.0
uvicorn>=0.35,<1.0
pydantic>=2.11,<3.0
torch>=2.0
torchvision
nudenet
pillow
opencv-python
segment-anything
```

#### 11-2. /api/status GPU検出

```python
import torch
gpu_available = torch.cuda.is_available()
```

#### 11-3. /api/model/download SSEストリーム化

StreamingResponse で text/event-stream を返し進捗配信。
フロント側 pythonClient.ts の subscribeToBackendModelProgress はSSE想定で実装済み。

#### 11-4. /api/nsfw/detect

```python
from nudenet import NudeDetector
detector = NudeDetector()

@app.post(/api/nsfw/detect)
def detect(request: DetectRequest):
    img = decode_base64_image(request.image_base64)
    detections = detector.detect(img)
    return {detections: [
        {label: d[class], confidence: d[score],
         x: d[box][0], y: d[box][1],
         width: d[box][2]-d[box][0], height: d[box][3]-d[box][1]}
        for d in detections if d[score] >= request.threshold
    ]}
```

#### 11-5. /api/sam3/segment

```python
@app.post(/api/sam3/segment)
def segment(request: SegmentRequest):
    predictor.set_image(decode_base64_image(request.image_base64))
    masks, _, _ = predictor.predict(
        point_coords=np.array([[p[x], p[y]] for p in request.points]),
        point_labels=np.array([p[label] for p in request.points]),
        multimask_output=False,
    )
    return {mask_base64: encode_mask_base64(masks[0]), status: ok}
```

#### 11-6. /api/sam3/auto-mosaic

NudeNet検出バウンディングボックス中心点をSAM3ポジティブポイントとして渡し、
各マスクにOpenCV/Pillowでモザイク適用後、base64画像を返す。

---

### Chapter 12：UI/UX全面改善と実用レベルへの再設計

#### 背景

- 現状のUIは機能接続は進んでいるが、実利用時の視認性・操作性・学習コストの面で未完成。
- 画像の上に説明テキストや補助表示が重なり、編集対象そのものを見失いやすい。
- テキスト、吹き出し、会話枠、オーバーレイなどの見た目が仮表示寄りで、実際の仕上がりを判断しづらい。
- サイズ変更や位置調整がボタン中心で、一般的な編集ソフトの操作期待に合っていない。
- 全体として「動作確認はできるが、常用できるUI」には至っていない。

#### 目標

- UIを全面的に見直し、少なくとも身内テストで「迷わず使える」水準まで引き上げる。
- 中央キャンバスを主役にし、画像確認と編集結果確認を最優先にしたレイアウトへ再設計する。
- 他の画像編集・漫画編集・配信用クリエイティブツールを参考に、馴染みやすいUI/UXを採用する。
- 仮表示ではなく、編集結果に近いプレビューを標準にする。

#### 再設計方針

- キャンバス上に常時重なる説明テキスト・補助カードは最小化し、必要時のみ表示する。
- 左右パネル、上部バー、下部ステータスの責務を整理し、何をする場所かが一目で分かる構成にする。
- ツールはアイコン中心でもよいが、hover/選択状態/現在モードが明確に分かることを必須条件とする。
- 主要操作は日本語で統一しつつ、専門用語は必要に応じて補足する。
- 頻出操作はボタン連打ではなく、入力欄・数値ボックス・スライダー・ドラッグ操作を中心に再設計する。

#### 具体タスク

**12-1. 主要商用/定番ツールのUI調査**
- 参考: Photoshop, CLIP STUDIO PAINT, Canva, Figma, comic/template editor系
- レイアウト、ツール配置、インスペクター、プロパティ編集、レイヤー一覧、ズーム導線を比較

**12-2. 情報設計のやり直し**
- グローバル操作、ページ操作、レイヤー操作、プロパティ編集、書き出し設定を分離
- 「今選択中の対象」と「今変更できる値」を常に分かるようにする

**12-3. キャンバスUIの再設計**
- 画像の上に不要なオーバーレイを出さない
- テキスト・吹き出し・会話枠・透かし・モザイクを実表示寄りに改善
- 選択枠、ハンドル、スナップ、整列表示を見やすく整理

**12-4. プロパティ編集UIの刷新**
- 位置、サイズ、透明度、角度、フォントサイズなどを数値入力とスライダーで編集可能にする
- ボタンでしか変更できない項目を減らす
- テキストボックス / スピンボックス / セグメント切替 / カラーピッカーの使い分けを整理

**12-5. モード別UXの整理**
- 選択 / 文字 / 会話枠 / 吹き出し / モザイク / オーバーレイで表示すべきプロパティを最適化
- 未選択時は簡潔、選択時は詳細を出す

**12-6. 初回利用導線の改善**
- 画像を読み込んだ後の最初の一手が直感的に分かるUIにする
- サンプル画像読み込み、保存、書き出し、レイヤー追加までの導線を短くする

#### 完了条件

- キャンバスを見たときに、画像が主役でありUIに隠されない
- テキスト・吹き出し・会話枠が「仮ラベル」ではなく、編集結果に近い見た目で確認できる
- サイズや位置調整の主要操作が入力欄またはスライダー中心で行える
- 初見ユーザーがサンプル画像読み込み→文字追加→保存→PNG書き出しまで迷わず到達できる
- 身内テストで「見た目が荒い」「どこを触ればいいか分からない」という指摘が大幅に減る

---

## 推奨実装順

```
Chapter 12（UI/UX全面改善）
    ↓ 実用レベルのUIが整い、身内テスト・フィードバック収集が可能になる
Chapter 11（Pythonバックエンド本実装）
    ↓ SAM3/NudeNetが実際に動作する
```

---

## 技術的注意点

### KonvaCanvasの描画パターン
- カスタムテキスト/メッセージウィンドウ描画はすべて useEffect 内でCanvas 2Dコンテキストに描画し Konva.Image として表示
- パフォーマンス最適化：useRef でCanvasキャッシュ、依存変数変化時のみ再描画

### workspaceStore の更新パターン
- 全アクションはイミュータブル更新（スプレッド演算子）
- アンドゥ対象アクションは pushToUndoStack(state) を更新直前に呼ぶ
- セレクタは selectActiveImage({ pages, activePageId }) を経由する

### backendStore と workspaceStore の境界
- バックエンド推論結果（SAM3候補、NSFW検出）は backendStore 管理
- キャンバスに適用済みのレイヤーは workspaceStore 管理
- BackendPanel → addBackendMosaicLayers / addBackendOverlayLayers で workspaceStore に橋渡し

### プロジェクト永続化
- Electronパッケージ版：app.getPath(userData)/creatorscoco-store.json にfs経由で保存
- ブラウザ開発モード（npm run dev Vite単体）：localStorageにフォールバック
- electron-storeは不使用（v10はESM-only、CommonJS main.cjs と非互換のため）

---

## ビルド・起動方法

```bash
# 開発（Vite + Electron 同時起動）
npm run dev

# Viteビルドのみ
node node_modules/vite/bin/vite.js build

# ポータブル配布用exe作成
export CSC_IDENTITY_AUTO_DISCOVERY=false
node node_modules/electron-builder/cli.js --win portable

# テスト
node node_modules/vite/bin/vitest.js run
```

Node.js は C:\Program Files
odejs
ode.exe に存在。
npx は Git Bash では動作しないため node node_modules/... 形式で実行。
