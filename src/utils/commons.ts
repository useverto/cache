export const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export const addHoursToDate = (date: Date, hours: number): Date => {
    return new Date(new Date(date).setHours(date.getHours() + hours));
}

export const cleanExecution = () => {
    process.env = {};
}

export const randomString = (length: number) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz'.split('');

    if (!length) {
        length = Math.floor(Math.random() * chars.length);
    }

    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }

    return str;
}
