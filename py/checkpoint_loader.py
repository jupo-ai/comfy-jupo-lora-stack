from .utils import Field
from comfy.comfy_types import IO
from nodes import CheckpointLoaderSimple
import folder_paths


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
