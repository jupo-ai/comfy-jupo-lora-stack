from .py.utils import mk_name, un_name, set_default_category
from .py import lora_stack

NODE_CLASS_MAPPINGS = {
    mk_name("LoRA_Stack_(jupo)"): lora_stack.JupoLoRAStack, 
    mk_name("LoRA_Loader_(jupo)"): lora_stack.JupoLoRALoader, 
    mk_name("Apply_LoRA_Stack"): lora_stack.ApplyLoRAStack, 
    mk_name("Stack_to_WanWrapper"): lora_stack.StackToWanWrapper
}

set_default_category(NODE_CLASS_MAPPINGS)

NODE_DISPLAY_NAME_MAPPINGS = {k: un_name(k) for k in NODE_CLASS_MAPPINGS}
WEB_DIRECTORY = "./web"

