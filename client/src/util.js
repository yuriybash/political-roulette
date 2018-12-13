export function log(text) {
    let time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

export function log_error(text) {
    let time = new Date();
    console.error("[" + time.toLocaleTimeString() + "] " + text);
}

export function reportError(errMessage) {
    log_error("Error " + errMessage.name + ": " + errMessage.message);
}
