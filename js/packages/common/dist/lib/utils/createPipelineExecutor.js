"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipelineExecutor = void 0;
async function createPipelineExecutor(data, executor, { delay = 0, jobsCount = 1, sequence = 1, } = {}) {
    function execute(iter) {
        executor(iter.value);
    }
    async function next() {
        if (sequence <= 1) {
            const iter = data.next();
            if (iter.done) {
                return;
            }
            await execute(iter);
        }
        else {
            const promises = [];
            let isDone = false;
            for (let i = 0; i < sequence; i++) {
                const iter = data.next();
                if (!iter.done) {
                    promises.push(execute(iter));
                }
                else {
                    isDone = true;
                    break;
                }
            }
            await Promise.all(promises);
            if (isDone) {
                return;
            }
        }
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        else {
            await Promise.resolve();
        }
        await next();
    }
    const result = new Array(jobsCount);
    for (let i = 0; i < jobsCount; i++) {
        result[i] = next();
    }
    await Promise.all(result);
}
exports.createPipelineExecutor = createPipelineExecutor;
//# sourceMappingURL=createPipelineExecutor.js.map