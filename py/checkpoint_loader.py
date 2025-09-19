from .utils import Field
from comfy.comfy_types import IO
from nodes import CheckpointLoaderSimple
import folder_paths
import json


# ===============================================
# Checkpoint Loader
# ===============================================

class JupoCheckpointLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "ckpt_name": Field.combo(folder_paths.get_filename_list("checkpoints")), 
            }, 
        }
    
    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE)
    FUNCTION = "execute"

    def execute(self, ckpt_name: str):
        loader = CheckpointLoaderSimple()
        out = loader.load_checkpoint(ckpt_name)

        return out


# ===============================================
# Checkpoint Selector
# ===============================================
class JupoCheckpointSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {}, 
            "optional": {
                "prev_trigger": Field.string(forceInput=True), 
                "checkpoint": Field.string(multiline=True), # js側で非表示
            }
        }
    
    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, IO.STRING)
    RETURN_NAMES = ("MODEL", "CLIP", "VAE", "trigger")
    FUNCTION = "execute"

    def execute(self, prev_trigger="", checkpoint=""):
        
        value = json.loads(checkpoint)
        if not isinstance(value, dict):
            raise ValueError("checkpoint widget: 不正なJSON値です")
        
        enabled = value.get("enabled")
        if not enabled:
            raise ValueError("checkpoint widget: 有効なcheckpointがありません")
        
        path = value.get("path")
        loader = CheckpointLoaderSimple()
        model, clip, vae = loader.load_checkpoint(path)

        trigger = prev_trigger
        enabled_trigger = value.get("enabled_trigger")
        trigger_value = value.get("trigger")
        if enabled_trigger and trigger_value.strip():
            trigger += trigger_value
        
        return (model, clip, vae, trigger)