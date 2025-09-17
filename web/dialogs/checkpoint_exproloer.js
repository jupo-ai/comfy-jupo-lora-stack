import { FileExplorer } from "./explorer/file_explorer.js";
import { CheckpointInfoDialog } from "./checkpoint_info_dialog.js";

// ==============================================
// Checkpoint選択ダイアログ
// ==============================================
export class CheckpointExplorer extends FileExplorer {
    constructor(callback) {
        super(callback);
        this.apiDir = "checkpoints";
        this.infoDialog = CheckpointInfoDialog;
    }
}