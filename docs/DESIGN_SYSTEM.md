# WARICAのデザイン管理

Tailwind CSS 4.3、shadcn/ui（Radix）、Lucideで3画面を管理します。基礎部品はshadcn CLI 4.21.0の公式new-yorkレジストリから導入し、アプリ固有のプリセットを重ねています。

## 変更する場所

| 変更内容                              | 管理元                                   | 反映先                              |
| ------------------------------------- | ---------------------------------------- | ----------------------------------- |
| メイン・サブ・アクセントの3色         | `src/design/theme.ts`                    | 全画面・ブラウザのテーマ色・favicon |
| フォント・角丸・操作部品の基本サイズ  | `src/app/globals.css` の `@theme inline` | Tailwindユーティリティ経由で全画面  |
| カード・入力・見出し・アバター・通知  | `src/components/ui/index.tsx`            | 各画面と支払い部品                  |
| アイコンボタン・リンクの色とサイズ    | `src/components/IconAction.tsx`          | 全操作。`variant` と `size` で選択  |
| ページのURL・ナビゲーション・表示条件 | `src/config/navigation.ts`               | 共通ナビゲーション・未登録時の案内  |
| 画面枠・データ復旧・バックアップ      | `src/components/AppShell.tsx`            | RootLayoutから一度だけ配置          |
| イベントと支払いの共有状態            | `src/app/useWarikanStore.tsx`            | RootLayoutのProviderから全画面      |

## 配色

- `main`: 深いティール。文字・線・精算結果の背景。
- `sub`: 淡いオフホワイト。ページ・カード・入力欄の背景。
- `accent`: ミントブルーグリーン。主要操作・選択状態・強調面。

色コードは `theme.ts` だけに記載します。`RootLayout` がCSS変数として渡し、Tailwindの `bg-accent`、`text-main` などで参照します。淡い面や区切り線は `bg-accent/15`、`border-main/10` のような3色の透明度から作ります。透過と継承を除き、追加の基本色は使いません。Tailwind標準の色パレットは無効にしています。

補助文字・入力のプレースホルダーには `text-muted-foreground` を使い、`globals.css` の共通変数で濃度を管理します。標準背景上で小さい文字も4.5:1以上のコントラストを確保するため、メイン色75%とサブ色25%を混合しています。個別の文字に薄い透明度を追加しないでください。

ミント背景の操作には濃いメイン色のアイコンを置きます。警告・精算の方向は色を増やさず、アイコンと必要な文言で区別します。アバターも同じ配色です。

## ページの作り方

1. `src/config/navigation.ts` に画面情報と表示条件を登録する。
2. `page.tsx` は固有の入力・表示に専念し、共通部品を組み合わせる。
3. AppShell・Provider・CSSの読み込みをページごとに追加しない。
4. 共通部品の見た目は管理元を変更する。ページの `className` はレイアウトや固有の情報階層に使い、同じ見た目が複数箇所に増えたら共通部品へ移す。

操作は原則アイコンのみとし、`label` からアクセシブル名とツールチップを渡します。入力ラベル・ページ見出しは読み上げ向けにも保持します。操作部品は原則48px、フォーカスは濃い輪郭で識別できるようにします。

## 確認

`pnpm check:design` はテーマ外の色コード、標準色パレット、ページでのレイアウト重複・直接の入力部品を検出します。`pnpm lint` とCIからも実行されます。

ブラウザテストでは、PCと320px幅で登録・編集・精算・保存失敗・復旧を確認します。axeによるラベル・コントラスト等の検査は、各画面・入力前後・支払い履歴・確認画面で実施します。通知やダイアログの表示アニメーションが終わってから評価し、検査ルールや対象要素の除外は行いません。CSS変数の変更が3画面の主要操作に反映され、画面遷移で共通レイアウトが作り直されないことも検証します。

参考: [Tailwind CSSのテーマ変数](https://tailwindcss.com/docs/theme)

## 入力と移動

スマートフォンの共通ナビゲーションは画面下に固定し、セーフエリアと本文下部の余白でコンテンツとの重なりを避けます。PCでは従来どおり左側に配置します。

`PaymentWorkspaceProvider` は未登録の支払いと編集中の支払いを別々に保持します。ページを往復しても入力は残り、編集キャンセルでは元の未登録入力へ戻ります。新規追加後は支払者・対象者を残し、金額へフォーカスを戻します。イベントのリセット・インポート・再読み込みでは下書きを破棄します。下書きはメモリだけに置き、バックアップや精算計算へ含めません。

通知はshadcn/uiのSonner、大きな金額欄は `TextInput` の `amount` バリアントを使用します。動きを減らす端末設定ではアニメーションとトランジションを抑制します。

## shadcn/uiとLucideへの対応

| 役割                             | 使用するshadcn/ui部品                     |
| -------------------------------- | ----------------------------------------- |
| アイコン操作と移動               | Button / Tooltip                          |
| イベント・支払い内容の候補       | Toggle Group / Tooltip                    |
| 金額・名前・内容・ファイル       | Input / Label / Field                     |
| 支払者                           | Native Select / Native Select Option      |
| 対象者                           | Checkbox / Label / FieldSet / FieldLegend |
| 共有テキスト                     | Textarea                                  |
| カード・見出し                   | Card / CardHeader / CardTitle             |
| 件数・メンバー表示               | Badge / Avatar / AvatarFallback           |
| 注意・エラー                     | Alert / AlertDescription                  |
| 計算ヘルプ                       | Collapsible / Button                      |
| データ未登録                     | Empty / EmptyMedia / EmptyContent         |
| 削除・リセット・インポートの確認 | Alert Dialog                              |
| 完了通知                         | Sonner                                    |
| 読み込み                         | Spinner（Lucide）                         |

`src/components/ui/` の小文字ファイルがshadcnの基礎部品です。`index.tsx`、`IconAction`、`IconChoices`はWARICA用の組み合わせ・サイズ指定を担当し、基礎部品の動作を再実装しません。クラスの競合は共通の `src/lib/utils.ts` の `cn`（clsx + tailwind-merge）で解消します。

`ApplicationUI` はRootLayoutに一度だけ置き、TooltipProvider・確認ダイアログ・Toasterを全ページへ提供します。確認ダイアログはキャンセルを初期フォーカスとし、閉じたら起点の操作へ戻します。イベントを置き換えた場合は本文へ戻します。

shadcnの `background`・`foreground`・`primary`・`destructive` などは新しい色ではなく、既存の3色への意味上の別名です。`globals.css` で接続しています。destructiveもメイン色を使い、文言と確認操作で区別します。

Lucideは1.45.0。独自のSVGアイコンは持たず、faviconも `generate:icons` で同じSplitコンポーネントから生成します。生成物 `src/design/brand-mark.json` はコミットし、本番ビルド時にも再生成します。

部品追加は `pnpm dlx shadcn@4.21.0 add <component>` を使用します。`components.json` を設定元とし、取り込み後は3色テーマ・48pxの主要操作領域を確認してください。CLIが `cn` パッケージから取り込んだ場合は共通の `@/lib/utils` に揃えます。

公式仕様: [shadcn/ui](https://ui.shadcn.com/docs/components) / [テーマ](https://ui.shadcn.com/docs/theming) / [Lucide](https://lucide.dev/guide/packages/lucide-react)

## 未使用コードの管理

shadcn/uiは実際に使う部品だけを保持します。新しい部品を取り込んだ後は、未使用のサブコンポーネントと公開設定を削除し、必要になった時に再導入します。Toggle Group専用のスタイル定義は同じファイルに置いています。

`pnpm check:unused`（Knip）は画面・設定・スクリプト・テストからの参照を調べ、未使用ファイル・依存関係・エクスポートを検出します。`pnpm check` とCIにも含まれます。型検査では未使用のローカル変数・引数もエラーにします。`eslint-config-next` はFlatCompatの短縮名から読み込まれるため、Knip設定に理由付きの例外を置いています。
