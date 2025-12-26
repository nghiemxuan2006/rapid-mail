import type { ToastOptions } from "react-toastify"
import { toast } from "react-toastify"
export const showNotifications = (type: "warning" | "error" | "success" | "info", message: string = "success") => {

    const config: ToastOptions = {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        progress: undefined,
        theme: "light",
    }
    switch (type) {
        case "warning":
            toast.warn(message, config)
            break;
        case "success":
            toast.success(message, config)
            break;
        case "info":
            toast.info(message, config)
            break;
        default:
            toast.error(message, config)
            break;
    }
}
