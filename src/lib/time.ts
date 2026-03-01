export type NowFn = () => Date;

export const systemNow: NowFn = () => new Date();
