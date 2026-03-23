# CreatorsCOCO

CreatorsCOCO は、CG 集・差分・会話付き画像の制作を想定した、Electron + React ベースのデスクトップ編集ツールです。ローカル FastAPI backend と連携し、SAM3 / NSFW review を使ったマスク候補確認や自動モザイク補助も行えます。

現時点では `portable exe` を前提に、身内テストや試用版配布を進める方針です。

## 現在できること

Plan.md の MVP と 4 章中盤までを中心に、次の機能は実際に使える状態です。

- 画像読み込み、ページ管理、複製、並べ替え
- テキスト、吹き出し、メッセージウィンドウ、モザイク、オーバーレイ、ウォーターマークの編集
- PNG / PDF / ZIP 書き出し
- autosave、手動 save、restore、undo / redo
- backend review UI
- SAM3 auto mosaic
- SAM3 manual segment
- NSFW detection review
- 全ページ batch SAM3 実行
- review 候補の再計算、差し戻し、candidate 単位の調整
- schema version 付き保存と migration
- Help / About での runtime 状態、performance metrics、release readiness 表示
- diagnostics report、runtime profile、portable handoff bundle の export / import
- portable smoke report の import

## 配布版の現在地

MVP としてはかなり終盤です。少なくとも「portable で配って、触って、フィードバックを返してもらう」段階には入っています。

現在の正式ルートは次です。

- Windows 配布: portable exe
- backend 同梱: PyInstaller backend を Electron resources へ同梱
- smoke test: `npm run smoke:portable`
- 診断の持ち帰り: `portable-smoke-report.json` または handoff bundle を Help から import

補足:

- Windows packaged では `NudeNet native` は使える場合があります
- Windows packaged では `SAM3 native` はまだ安定運用に向かないため、現状は `heuristic` を正式運用としています
- NSIS installer はまだ環境依存で不安定なので、配布基準から外しています

## ローカルセットアップ

### Frontend

```powershell
npm install
npm test
```

### Python backend

```powershell
python -m venv python-backend/.venv
python-backend/.venv\Scripts\Activate.ps1
python -m pip install -r python-backend/requirements.txt
python -m unittest discover -s python-backend/tests -p "test_*.py"
```

### optional native backend

```powershell
npm run backend:install-native
```

### Python 3.12 系での SAM3 native 実験環境

```powershell
npm run backend:setup-sam3-native
```

現状の整理:

- Python 3.14.3 環境では NudeNet native の導入は比較的通しやすいです
- Python 3.12.11 環境では `sam3` package 自体は導入できています
- ただし Windows packaged runtime では Triton / TorchScript source access の制約があり、SAM3 native はまだ正式運用に向きません

そのため、今のベストプラクティスは次です。

- portable Windows build: SAM3 は heuristic を正式運用
- NudeNet: native available なら使用
- native SAM3: 開発用・検証用の実験扱い

## 実行方法

### 開発起動

```powershell
npm run dev
```

必要なら `CREATORS_COCO_PYTHON` を設定して使う Python runtime を固定できます。

### backend build

```powershell
npm run backend:build
```

### portable build

```powershell
npm run dist:win
```

これで Vite build、PyInstaller backend build、Electron packaging を通して portable exe を `release/` に生成します。

## portable smoke test

```powershell
npm run smoke:portable
```

このスクリプトは以下を行います。

- portable exe を temp 配下へコピー
- 起動
- `/api/status` をポーリング
- `portable-smoke-report.json` を出力

report には次の情報が入ります。

- 実行日時
- コピー先 exe path
- exe の SHA-256
- exe のサイズと file version
- smoke 用フォルダ
- backend status 到達可否
- 起動ブロックや timeout のエラー内容
- backend status payload

別 PC や別フォルダで回した `portable-smoke-report.json` は、アプリ内の `Help -> Portable Smoke Test -> Import portable smoke report` から取り込めます。取り込んだ内容は smoke checklist や release readiness、diagnostics export に反映されます。

詳しい手順は [docs/portable-smoke-test.md](D:/Other/CreatorsCOCO/docs/portable-smoke-test.md) を参照してください。

## SAM3 checkpoint 設定

SAM3 native を試す場合は checkpoint path と config path を設定できます。

- アプリ内: `Help -> Backend strategy`
- 環境変数:

```powershell
$env:CREATORS_COCO_SAM3_CHECKPOINT = "D:\\models\\sam3.pt"
$env:CREATORS_COCO_SAM3_CONFIG = "D:\\models\\sam3.yaml"
```

また、`python-backend/models/sam3/` 以下の checkpoint / config も自動検出します。

アプリ内では次を確認できます。

- `SAM3 checkpoint ready`
- `missing`
- `not configured`
- native unavailable reason
- recommendation

## 保存データ

renderer の保存データは schema version 付きで管理しています。

- current schema: `v1`
- migration path: `v0 -> v1`
- reference: [docs/project-schema.md](D:/Other/CreatorsCOCO/docs/project-schema.md)

保存方針の要点:

- `schemaVersion` なしの旧データは `v0` として扱う
- restore 時に最新版 schema へ normalize する
- migration 後の snapshot を storage に書き戻す

## Help / About で見える情報

試用版の運用をしやすくするため、Help / About に次をまとめています。

- backend target と runtime
- SAM3 / NudeNet capability
- checkpoint path / config path / readiness
- recommendation と native unavailable reason
- trial readiness
- release readiness
- portable smoke checklist
- imported handoff history
- recent performance
- performance thresholds
- backend strategy の apply / refresh
- runtime profile export / import
- SAM3 setup script export
- diagnostics report export
- portable handoff bundle export

## 現在の制約

いま把握している大きな制約は次です。

- Windows の Smart App Control / Defender に未署名 exe が引っかかることがある
- NSIS installer はこの環境ではまだ不安定
- Windows packaged での SAM3 native はまだ実用安定に届いていない
- 高解像度・長時間セッションの performance threshold はまだ実地調整中

## 今後の実装予定

Plan.md を踏まえると、次の優先度で進めるのが自然です。

### 1. 4.7 実運用寄せの残り

- 実運用画像での review 調整
- batch 運用時の細かな UX 改善
- 再計算 / 差し戻し / review 候補の扱いの微調整

### 2. 5 章後半相当

- 自動化の深掘り
- batch 処理の強化
- 試用版フィードバックを踏まえた運用機能の追加

### 3. データ構造整理

- schema の世代管理をさらに明文化
- migration の将来追加方針を固定
- 保存データ互換性の整理

### 4. FastAPI backend の本実装仕上げ

- endpoint 群の安定化
- エラー設計の微調整
- native / heuristic 二層構成の整備継続
- model load 戦略の改善

### 5. パフォーマンス指標

- 大量ページ
- 高解像度画像
- 長時間セッション
- threshold の実測ベース調整

### 6. 9-10 章相当の配布整備

- portable 配布の運用固定
- backend 同梱構成の微調整
- 配布手順の整理
- 将来的な署名や installer 方針の再検討

## 現時点の推奨運用

いま一番おすすめなのは次です。

1. `portable exe` を身内へ配る
2. sample と実画像で試してもらう
3. `portable-smoke-report.json` か handoff bundle を返してもらう
4. Help の diagnostics と imported report で詰まりどころを回収する

この運用なら、実装コストを増やしすぎずに MVP を実地で固めていけます。
