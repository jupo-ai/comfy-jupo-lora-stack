import { ModelInfoDialog } from "./model_info/model_info_dialog.js";


// ==============================================
// Checkpoint情報表示ダイアログ
// ==============================================
export class CheckpointInfoDialog extends ModelInfoDialog {
    constructor(widget, forceDisableTrigger = true) {
        super(widget);
        this.modelPath = widget?.value;
        if (widget?.value?.path) {
            this.modelPath = widget.value.path;
        }
        this.modelDir = "checkpoints";
        this.forceDisableTrigger = forceDisableTrigger;
    }
}