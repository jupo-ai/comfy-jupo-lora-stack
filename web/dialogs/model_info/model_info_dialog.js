import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

import { BaseDialog } from "../base/base_dialog.js";
import { SimpleDialog } from "../simple/simple_dialog.js";

import { DataManager } from "./data_manager.js";

import { InfoSection } from "./info_section.js";
import { PreviewSection } from "./preview_section.js";
import { GallerySection } from "./gallery_section.js";
import { TriggerSection } from "./trigger_section.js";

loadCSS("dialogs/model_info/css/model_info_dialog.css");

// ==============================================
// モデル情報ダイアログの基底クラス
// ==============================================
export class ModelInfoDialog extends BaseDialog {

    constructor(widget) {
        super();
        this.widget = widget;

        // 継承クラスでオーバーライド
        this.modelPath = null;
        this.modelDir = null;
        this.forceDisableTrigger = false;

        // 各セクション
        this.metadataSection = null;
        this.civitaiSection = null;
        this.previewSection = null;
        this.gallerySection = null;
        this.triggerSection = null;

        // データ管理
        this.dataManager = null;

        // サブダイアログ
        this.subDialog = new SimpleDialog();

        this.createUI();
    }

    // ------------------------------------------
    // UIを作成
    // ------------------------------------------
    createUI() {
        this.container.classList.add("jupo-info-dialog-container");

        this.createHeader();
        this.createUpperSections();
        this.createGallerySection();
        this.createTriggerSection();
    }

    // --- Header ---
    createHeader() {
        this.headerTitle = $el("div.jupo-info-dialog-header-title");
        this.headerStatus = $el("div.jupo-info-dialog-header-status");
        const header = $el("div.jupo-info-dialog-header", [
            this.headerTitle, 
            this.headerStatus
        ]);
        this.headerTitle.textContent = "ヘッダー";
        this.headerStatus.textContent = "初期化";

        this.container.append(header);
    }

    // --- Upper Sections ---
    createUpperSections() {
        this.createMetadataSection();
        this.createCivitaiSection();
        this.createPreviewSection();

        const upperContainer = $el("div.jupo-info-dialog-upper-container");
        const leftContainer = $el("div.jupo-info-dialog-left-container");
        const rightContainer = $el("div.jupo-info-dialog-right-container");

        leftContainer.append(this.metadataSection.element, this.civitaiSection.element);
        rightContainer.append(this.previewSection.element);
        upperContainer.append(leftContainer, rightContainer);

        this.container.append(upperContainer);
    }

    // --- Metadata Section ---
    createMetadataSection() {
        this.metadataSection = new InfoSection({
            title: "メタデータ", 
            callback: () => this.showRawMetadata(), 
        });
    }

    // --- Civitai Section ---
    createCivitaiSection() {
        this.civitaiSection = new InfoSection({
            title: "Civitai", 
            callback: () => this.showRawCivitai(), 
        });
    }

    // --- Preview Section ---
    createPreviewSection() {
        this.previewSection = new PreviewSection({
            onUpload: (file) => this.onUploadPreview(file), 
            onDelete: () => this.onDeletePreview()
        });
    }

    // --- Gallery Section ---
    createGallerySection() {
        this.gallerySection = new GallerySection({
            onSave: (image) => this.onSaveGallery(image), 
            onPreview: (image) => this.onPreviewGallery(image)
        });

        this.container.append(this.gallerySection.element);
    }

    // --- Trigger Section ---
    createTriggerSection() {
        this.triggerSection = new TriggerSection(this.widget);

        this.container.append(this.triggerSection.element);
    }


    // ------------------------------------------
    // 生データを表示
    // ------------------------------------------
    showRawMetadata() {
        const data = this.dataManager.metadata;
        this.subDialog.show(data);
    }

    showRawCivitai() {
        const data = this.dataManager.civitai;
        this.subDialog.show(data);
    }


    // ------------------------------------------
    // プレビューセクションコールバック
    // ------------------------------------------
    // onUpload
    async onUploadPreview(file) {
        await this.dataManager.uploadPreview({ file: file });
        await this.dataManager.loadPreview();
        this.previewSection.display(this.dataManager.preview);
    }

    // onDelete
    async onDeletePreview() {
        await this.dataManager.deletePreview();
        await this.dataManager.loadPreview();
        this.previewSection.display(this.dataManager.preview);
    }


    // ------------------------------------------
    // ギャラリーセクションコールバック
    // ------------------------------------------
    // onSave
    async onSaveGallery(image) {
        // image.urlをダウンロード
        try {
            const response = await fetch(image.url, { mode: 'cors' });
            if (!response.ok) {
                throw new Error(`HTTPS error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const a = $el("a", {
                href: objectUrl, 
                download: new URL(image.url).pathname.split("/").pop() || "download"
            });

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error("メディアのダウンロードに失敗しました: ", error);
            alert("ダウンロードに失敗しました。新しいタブでメディアを開きます");
            window.open(image.url, "_blank");
        }
    }

    // onPreview
    async onPreviewGallery(image) {
        if (confirm("プレビューとして設定しますか？")) {
            await this.dataManager.uploadPreview({ url: image.url });
            await this.dataManager.loadPreview();
            this.previewSection.display(this.dataManager.preview);
        }
    }


    // ------------------------------------------
    // 表示
    // ------------------------------------------
    async show() {
        // データマネージャ初期化
        this.dataManager = new DataManager({
            modelDir: this.modelDir, 
            modelPath: this.modelPath, 
            callback: (status) => this.headerStatus.textContent = status
        });

        this.headerTitle.textContent = this.getFileName();
        this.headerStatus.textContent = "読み込み中...";

        // ダイアログをDOMに追加して表示
        super.show();

        // データ読み込み
        try {
            await this.dataManager.load();
            this.displayModelInfo();
        
        } catch (error) {
            this.headerStatus.textContent = "読み込みエラー";
            console.error("モデル情報の読み込みに失敗: ", error);
        }

        
    }

    // ------------------------------------------
    // モデル情報を作成・表示
    // ------------------------------------------
    displayModelInfo() {
        this.displayMetadata();
        this.displayCivitai();
        this.previewSection.display(this.dataManager.preview);
        this.gallerySection.display(this.dataManager.civitai.images);
        this.triggerSection.display(this.dataManager.civitai.trainedWords, this.forceDisableTrigger);
    }

    // --- metadata
    displayMetadata() {
        const data = this.dataManager.metadata;
        this.metadataSection.addItem("名前", data.ss_output_name);
        this.metadataSection.addItem("学習元モデル", data.ss_sd_model_name);
    }

    // --- civitai
    displayCivitai() {
        const data = this.dataManager.civitai;

        // civitaiリンク
        let link = null;
        if (data.modelId && data.id) {
            link = $el("a.jupo-info-dialog-link", {
                href: `https://civitai.com/models/${data.modelId}?modelVersionId=${data.id}`, 
                textContent: "Link", 
                target: "_blank"
            });
        }

        this.civitaiSection.addItem("Civitai", link);
        this.civitaiSection.addItem("ベースモデル", data.baseModel);
    }

    
    // ------------------------------------------
    // ファイル名のみを取得
    // ------------------------------------------
    getFileName() {
        const lastSlash = Math.max(this.modelPath.lastIndexOf('/'), this.modelPath.lastIndexOf('\\'));
        let fileName = lastSlash !== -1 ? this.modelPath.substring(lastSlash + 1) : this.modelPath;
        const dotIndex = fileName.lastIndexOf('.');
        return dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
    }

    // ------------------------------------------
    // 閉じる
    // ------------------------------------------
    close() {
        super.close();
    }
}