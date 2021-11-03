export const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export const addHoursToDate = (date: Date, hours: number): Date => {
    return new Date(new Date(date).setHours(date.getHours() + hours));
}
