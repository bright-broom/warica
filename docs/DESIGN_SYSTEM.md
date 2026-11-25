# WARICAのデザイン管理

Tailwind CSS 4、shadcn/ui（Radix）、Lucide で3画面を作っています。基礎部品は shadcn CLI 4.21.0 の公式 new-york レジストリから入れ、アプリ固有の見た目は共通のプリセットに集めています。

## 考え方（2026-11-25 改訂）

公開ポートフォリオとして、初めて開いた人が用途を理解し、迷わず精算まで進めることを優先します。以前のポップなデザイン（ドット背景・硬い影・傾いたステッカー・グラデーション・キャッチコピーの見出し）は、操作を助けない装飾として外しました。

- 各画面の上に「ステップ n / 3」・見出し・その画面ですることを1〜2文で書く
- 主な操作（次へ・追加・保存・コピー）は文字付きボタンにする。行ごとに繰り返す操作（編集・削除・個別コピー）だけアイコンにし、名前は読み上げとツールチップで伝える
- 入力欄には見える見出しを付ける。任意の項目は見出しの横に「任意」と書く
- 押せない理由（金額が未入力、メンバーが2人未満など）はボタンの近くに文で出す
- 空の状態・進めない状態は、理由と次の操作を並べる（`EmptyState` の `action`）
- 色は意味のあるところにだけ使う：主要操作は main、現在位置・選択中は accent の薄い面、注意は accent の薄い面＋main の枠

## 変更する場所

| 変更内容                                                   | 管理元                               | 反映先                                 |
| ---------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| 基本の3色                                                  | `src/design/theme.ts`                | 全画面・ブラウザのテーマ色・ファビコン |
| 面・線・角丸・フォント・部品の枠                           | `src/app/globals.css`                | `data-ui` / `data-slot` を通して全画面 |
| パネル・画面の見出し・入力欄・注意・空の状態・ボタンの並び | `src/components/ui/index.tsx`        | 各画面                                 |
| 文字付きボタン・アイコンボタン                             | `src/components/actions.tsx`         | 全操作                                 |
| 入力の候補（イベント名・支払い内容）                       | `src/components/ChoiceChips.tsx`     | メンバー・支払い                       |
| 画面の URL・順番・開ける条件・進めないときの案内           | `src/config/navigation.ts`           | 手順のナビ・進み具合・空の状態         |
| ヘッダー・手順・保存エラーと復旧                           | `src/components/layout/AppShell.tsx` | RootLayout から一度だけ配置            |
| 台帳と下書きの状態                                         | `src/state/`                         | RootLayout の Provider から全画面      |

## 配色

- `main`（深いティール）：文字・線・主要操作の地・精算の概要の地
- `sub`（淡いオフホワイト）：紙面。パネルと入力欄は sub を少し明るくした `paper`、ページの地は main を4%混ぜた `canvas`
- `accent`（ミント）：現在の手順・選択中の候補と対象者・注意の面・ロゴ

色コードは `theme.ts` だけに書きます。派生色は `globals.css` で `color-mix` から作り、Tailwind 標準の色パレットは無効にしています。`accent-surface`・`accent-soft`・`accent-faint` はアクセントの濃さ3段階の単色です。補足文字の `text-muted-foreground` は main 75%で、紙面の上で 4.5:1 以上を保ちます。文字に個別の透明度を足さないでください。

## 画面の組み立て

1. `src/config/navigation.ts` に画面と、開ける条件・進めないときの案内を登録する
2. `page.tsx` は `PageHeader` → 各 `Panel` → `ActionRow` の順に、共通部品を組み合わせる
3. AppShell・Provider・CSS の読み込みをページごとに足さない
4. 同じ見た目が2か所以上に出たら、ページの `className` ではなく共通部品に移す

PC（1024px以上）は左に手順のナビ（番号・名前つきのリンク）とイベントの概要、右に本文を置きます。スマホは上に「進み具合」を出します。進み具合は見るためのもので、押す操作は持ちません。

## スマホの操作

- 操作ボタン・対象者のチェック・候補・ヘルプは右側に寄せる。片手で持ったときに親指が届く範囲にまとめるため。E2E（`mobile actions stay in the right half…`）で、表示中の全操作の中心が画面の右半分にあり、44px以上あることを検査している
- `ActionRow` はスマホでは縦に積み、どのボタンも右端にそろえる
- 入力の候補はスマホではアイコンだけ（名前は読み上げとツールチップ）、640px以上でアイコンと文字
- 本文はヘッダーの下から画面下までを独立したスクロール領域にし、末尾にセーフエリアの余白を足す。画面を移ると本文を先頭に戻す
- 本文の横スクロールを出さない（`overflow-x: clip`・`overscroll-behavior-x: none`）。縦スクロールとピンチ拡大は止めない
- 下部に固定のタブは置かない

## 状態の表示

| 状態                               | 表示                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| 読み込み中                         | 本文の中央にスピナー（読み上げは「読み込み中」）                              |
| 入力の誤り                         | 入力欄の枠を太くし、欄の下に直し方を書く。入力は消さない                      |
| 押せない                           | ボタンを薄くし、近くに理由を書く                                              |
| 保存の失敗・容量超過・別タブの更新 | 本文の上に `Notice alert`。再試行・書き出し・読み込み・最新を読み込むを並べる |
| 成功                               | Sonner の通知（追加・更新・リセット）、コピーは本文の状態表示                 |
| 空・進めない                       | `EmptyState`（理由と次の操作）                                                |

## shadcn/ui との対応

| 役割                       | 使う部品                                  |
| -------------------------- | ----------------------------------------- |
| ボタン・リンク             | Button / Tooltip                          |
| 入力の候補                 | Toggle Group / Tooltip                    |
| 金額・名前・内容・ファイル | Input / Label / Field                     |
| 支払った人                 | Native Select                             |
| 対象者                     | Checkbox / Label / FieldSet / FieldLegend |
| 共有用テキスト             | Textarea                                  |
| パネル・見出し             | Card / CardHeader / CardTitle             |
| 件数・メンバー             | Badge / Avatar                            |
| 注意・エラー               | Alert                                     |
| 補足の説明                 | Collapsible                               |
| 削除・置き換えの確認       | Alert Dialog                              |
| 通知                       | Sonner                                    |

`src/components/ui/` の小文字のファイルが shadcn の基礎部品、`index.tsx` が WARICA のプリセットです。基礎部品の動作は再実装しません。クラスの競合は `src/lib/utils.ts` の `cn`（clsx + tailwind-merge）で解きます。shadcn の `primary`・`destructive` などは新しい色ではなく、3色への意味上の別名です。

`ApplicationUI` は RootLayout に一度だけ置き、TooltipProvider・確認ダイアログ・Toaster を全画面に渡します。確認ダイアログは「キャンセル」に最初のフォーカスを置き、閉じたら押した操作に戻します。

ファビコンは `pnpm generate:icons`（`scripts/generate-brand-icon.mts`）が、ヘッダーと同じ Lucide の Split から `public/brand-icon.svg` を作ります。本番ビルドの前にも作り直します。

部品の追加は `pnpm dlx shadcn@4.21.0 add <component>`。取り込んだ後は、使わないサブコンポーネントを消し、3色のテーマと44px以上の操作領域を確認してください。

## 確認

- `pnpm check:design`：テーマ外の色コード、標準の色パレット、ページでの直接の入力部品・レイアウトの重複を検出する（`pnpm lint` と CI からも実行）
- `pnpm check:unused`（knip）：使っていないファイル・依存関係・エクスポート
- E2E：PC・320px・WebKit 390px で主要な操作、右側の操作領域、横スクロール、axe によるラベル・コントラストの検査

参考：[Tailwind CSS のテーマ変数](https://tailwindcss.com/docs/theme) / [shadcn/ui](https://ui.shadcn.com/docs/components) / [Lucide](https://lucide.dev/guide/packages/lucide-react)
