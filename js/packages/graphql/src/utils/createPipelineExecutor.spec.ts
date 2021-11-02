import { createPipelineExecutor } from "./createPipelineExecutor";

describe("createPipelineExecutor", () => {
  const LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("default configuration", async () => {
    const result: number[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
      },
      {}
    );
    expect(result).toEqual(LIST);
  });

  it("default configuration with async tasks", async () => {
    const result: number[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
        return Promise.resolve();
      },
      {}
    );
    expect(result).toEqual(LIST);
  });

  it("default configuration with async tasks with errors", async () => {
    const result: number[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
        return Promise.reject(new Error("test"));
      },
      {}
    );
    expect(result).toEqual(LIST);
  });

  it("big sequence", async () => {
    const result: number[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
      },
      {
        sequence: LIST.length + 2,
      }
    );
    expect(result).toEqual(LIST);
  });

  it("delay && sequence", async () => {
    const result: number[] = [];
    let countDelay = 0;
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
      },
      {
        sequence: 2,
        delay: () => {
          countDelay++;
          return Promise.resolve();
        },
      }
    );
    expect(result).toEqual(LIST);
    expect(countDelay).toBe(5);
  });

  it("log", async () => {
    const result: number[] = [];
    const txts: string[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
      },
      {
        name: "test",
        completeGroup: 2,
        log: {
          info(text: string) {
            txts.push(text);
          },
        } as any,
      }
    );
    expect(result).toEqual(LIST);

    expect(txts).toEqual([
      "test: 2 tasks were processed",
      "test: 4 tasks were processed",
      "test: 6 tasks were processed",
      "test: 8 tasks were processed",
      "test: 10 tasks were processed",
    ]);
  });

  it("log with jobCount=5", async () => {
    const result: number[] = [];
    const txts: string[] = [];
    await createPipelineExecutor(
      LIST.values(),
      (d) => {
        result.push(d);
      },
      {
        name: "test",
        completeGroup: 2,
        sequence: 3,
        jobsCount: 5,
        log: {
          info(text: string) {
            txts.push(text);
          },
        } as any,
      }
    );
    expect(result).toEqual(LIST);

    expect(txts).toEqual([
      "test: 2 tasks were processed",
      "test: 4 tasks were processed",
      "test: 6 tasks were processed",
      "test: 8 tasks were processed",
      "test: 10 tasks were processed",
    ]);
  });
});
