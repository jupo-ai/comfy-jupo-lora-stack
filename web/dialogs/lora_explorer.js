import { FileExplorer } from "./explorer/file_explorer.js";
import { LoRAInfoDialog } from "./lora_info_dialog.js";

// ==============================================
// LoRA選択ダイアログ
// ==============================================
export class LoRAExplorer extends FileExplorer{
    constructor(callback) {
        super(callback);
        
        this.apiDir = "loras";
        this.infoDialog = LoRAInfoDialog;
    }
}