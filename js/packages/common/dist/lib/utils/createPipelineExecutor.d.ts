export declare function createPipelineExecutor<T>(data: IterableIterator<T>, executor: (d: T) => void, { delay, jobsCount, sequence, }?: {
    delay?: number;
    jobsCount?: number;
    sequence?: number;
}): Promise<void>;
//# sourceMappingURL=createPipelineExecutor.d.ts.map