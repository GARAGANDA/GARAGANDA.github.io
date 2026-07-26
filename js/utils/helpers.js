export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Другие общие утилиты (если понадобятся)