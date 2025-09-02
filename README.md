# comfy-jupo-lora-stack

<img src="https://files.catbox.moe/6g9nt4.png" height=400>

LoRAをスタック形式で読み込みます  
以下の機能があります

### カスタムエクスプローラ
- オリジナルのLoRA選択GUIを提供します
- 設定からOFFにできます

### Civitai情報
- LoRA右クリック -> `情報を開く`を選択するとCivitaiから情報を取得します

### トリガーワード設定
- 上のCivitai情報画面でトリガーワードを設定できます
- デフォルトではOFFなので必要なLoRAにて設定してください
- trigger出力にて連結して出力されます

### プレビュー
- 上のCivitai情報画面でプレビューを設定できます
- 画像、動画を設定できます

### CLIP強度の個別設定
- LoRAを右クリック -> `Clipを個別設定`
- MODELとCLIPの強度を別々に設定できます
- 再び`CLIPを共通設定`にするとMODELとCLIPを共に設定します

### 表示名を設定
- LoRAを右クリック -> `表示名を設定`
- 自由に表示名を設定できます
- 日本語も使えます

### Stack to WanWrapper
- stackをKijai氏のWanVideo Wrapperのlora形式に変換するノードです
- blockなどは全部にまとめて設定することになります