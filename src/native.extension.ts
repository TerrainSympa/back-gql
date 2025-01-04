declare global {
    interface Array<T>{
        filterNullAndUndefined(): Exclude<T, null | undefined>[];
        randomElements(i?: number): T;
        shuffle(): T[];
    }
}

Array.prototype.filterNullAndUndefined = function<T>() {
    return this.filter((x): x is Exclude<T, null | undefined> => (x !== undefined && x !== null));
}

Array.prototype.randomElements = function<T>(i: number | undefined) {
    if(i === undefined || i === 1) {
        return this[Math.floor(Math.random() * this.length)];
    }
    return this.shuffle().slice(i);
}

Array.prototype.shuffle = function<T>() {
    return this.sort(() => 0.5 - Math.random());
}

export {};
