import { app } from "../../../scripts/app.js";
import { Utils } from "../ui.js";
import { CheckpointInfoDialog } from "../dialogs/checkpoint_info_dialog.js";

// ==============================================
// Ckpt Widget (Combo Widget) をカスタマイズ
// ==============================================

export function customize(widget) {
    // isClickedAtメソッドを追加
    widget.isClickedAt = function(x, y, node) {
        // ウィジェットの描画位置を確認
        const widgetY = this.last_y || 0;
        const widgetHeight = 20;
        const margin = 10;

        return (
            x >= margin &&
            x <= node.size[0] - margin &&
            y >= widgetY &&
            y <= widgetY + widgetHeight
        );
    };

    // showContextMenuメソッドを追加
    widget.showContextMenu = function(event, node) {
        const filename = this.value;

        const menuOptions = [
            {
                content: "ℹ️ 情報を開く", 
                callback: async () => {
                    const dialog = new CheckpointInfoDialog(this);
                    await dialog.show();
                }
            }
        ];

        new LiteGraph.ContextMenu(menuOptions, {
            event: event, 
            title: "Checkpoint", 
            className: "custom-checkpoint-menu", 
            node: node, 
            filter: false
        }, window);
    };

    // onClickメソッドを上書き
    widget.onClick = function({ e, node, canvas }) {
        const x = e.canvasX - node.pos[0];
        const width = this.width || node.size[0];

        if (x < 40) return this.decrementValue({ e, node, canvas });
        if (x > width - 40) return this.incrementValue({ e, node, canvas });

        Utils.showCheckpointChooser(e, this.value, (selected) => {
            this.setValue(selected, { e, node, canvas });
        });

        return true;
    }
}