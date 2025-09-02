import { api_get, api_post } from "../../utils.js";

// ==============================================
// APIデータを管理するクラス
// ==============================================

export class DataManager {
    constructor({ modelDir, modelPath, callback }) {
        this.apiName = encodeURIComponent(`${modelDir}/${modelPath}`);
        this.callback = callback;
        
        this.metadata = null;
        this.civitai = null;
        this.preview = null;
    }

    // ------------------------------------------
    // データを読み込み
    // ------------------------------------------
    async load() {
        this.callback("データ取得中...");
        await this.loadMetadata();
        await this.loadCivitai();
        await this.loadPreview();
        this.callback("読み込み完了");
    }

    async loadMetadata() {
        this.metadata = await api_get("metadata/" + this.apiName) || {};
        
    }

    async loadCivitai() {
        this.civitai = await api_get("civitai/" + this.apiName) || {};
        
    }

    async loadPreview() {
        this.preview = await api_get("preview/" + this.apiName) || {};
        
    }


    // ------------------------------------------
    // プレビューアップロード
    // ------------------------------------------
    async uploadPreview({ url, file }) {
        await api_post("save_as_preview", {
            apiName: this.apiName, 
            url: url, 
            file: file
        });
    }


    // ------------------------------------------
    // プレビュー削除
    // ------------------------------------------
    async deletePreview() {
        await api_post("delete_preview", {
            apiName: this.apiName
        });
    }
}