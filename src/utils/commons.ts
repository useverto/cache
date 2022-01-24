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

export const paginateArray = <T = any>(array: Array<any>, pageSize: number, pageNumber: number): T => {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize) as unknown as T;
}
