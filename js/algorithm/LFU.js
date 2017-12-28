/**
 * LFU
 */

function timeout(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * 缺页中断
 *
 * @param {any} pageTable 页表
 * @param {any} memory 内存
 * @param {any} memoryVolume 内存容量
 * @param {any} page 要访问的页
 * @param {any} time 当前时间
 * @param {any} memoryTime 读取内存时间
 * @param {any} interruptTime 缺页中断时间
 * @param {any} getOutPage 获取需要换出的页
 * @returns
 */
async function memoryPageDisplacement(
  pageTable,
  memory,
  memoryVolume,
  page,
  time,
  memoryTime,
  interruptTime,
  getOutPage
) {
  // 访问页表
  await timeout(memoryTime);
  let outPage = -1;
  // 判断页是否在内存
  if (pageTable[page].status === 0) {
    // 该页不在内存 缺页中断
    await timeout(interruptTime);
    if (memory.indexOf(-1) === -1) {
      // 内存已满
      /** 找最先进入的页面 */
      outPage = getOutPage(memory, pageTable);
      /** 换出最先进入内存的页面 */
      memory[memory.indexOf(outPage)] = -1;
    }
    // 将该页放入内存
    memory[memory.indexOf(-1)] = page;
    return {
      pageTable,
      memory,
      time: time + memoryTime + interruptTime,
      outPage
    };
  }
  // 该页在内存
  return {
    pageTable,
    memory,
    time: time + memoryTime,
    outPage
  };
}

async function TLBPageDisplacement(
  TLB,
  TLBAmount,
  page,
  time,
  TLBTime,
  getOutPage,
  memoryOutPage
) {
  // 去除被换出内存的页
  if (memoryOutPage !== -1 && TLB.indexOf(memoryOutPage) !== -1) {
    TLB[TLB.indexOf(memoryOutPage)] = { page: -1, visit: 0 };
  }
  // 修改快表
  await timeout(TLBTime);
  let outPage = -1;
  if (TLB.indexOf({ page: -1, visit: 0 }) === -1) {
    // 快表已满
    /** 找最先进入的页面 */
    outPage = getOutPage(TLB);
    /** 换出最先进入内存的页面 */
    TLB[outPage].page = -1;
    TLB[outPage].visit = 0;
  }
  // 将该页放入内存
  TLB[TLB.indexOf({ page: -1, visit: 0 })].page = page;
  return {
    TLB,
    time: time + TLBTime
  };
}

/**
 * 获取需要换出的页
 *
 * @param {any} pageTable 页表
 * @returns
 */
function MemoryGetOutPage(memory, pageTable) {
  let outPage = memory[0];
  // 寻找访问次数最少的页面
  memory.forEach(element => {
    if (pageTable[element].visit < pageTable[outPage].visit) {
      outPage = element;
    }
  });
  return outPage;
}

function TLBGetOutPage(TLB) {
  let outPage = 0;
  // 寻找访问次数最少的页面
  TLB.forEach(({ visit }, index) => {
    if (visit < TLB[outPage].visit) {
      outPage = index;
    }
  });
  return outPage;
}

/**
 * LFU置换内存
 *
 * @param {any} pageTable 页表
 * @param {any} memory 内存
 * @param {any} memoryVolume 内存容量
 * @param {any} page 要访问的页
 * @param {any} time 当前时间
 * @param {any} interruptTime 缺页中断时间
 * @returns
 */
async function LFU({
  pageTable,
  TLB,
  memory,
  memoryVolume,
  pageAmount,
  TLBAmount,
  page,
  time,
  interruptTime,
  memoryTime,
  TLBTime,
  hasTLB
}) {
  let outPage = -1;
  // 判断缺页
  if (page > pageAmount) {
    throw new Error("越界中断");
  }
  if (hasTLB) {
    // 检索快表
    await timeout(TLBTime);
    if (TLB.indexOf(page) === -1) {
      // 不在快表中
      ({ pageTable, memory, time, outPage } = await memoryPageDisplacement(
        pageTable,
        memory,
        memoryVolume,
        page,
        time,
        memoryTime,
        interruptTime,
        MemoryGetOutPage
      ));
      // 修改快表
      ({ TLB, time } = await TLBPageDisplacement(
        TLB,
        TLBAmount,
        page,
        time,
        TLBTime,
        TLBGetOutPage,
        outPage
      ));
      TLB[TLB.indexOf(page)].visit += 1;
    }
  } else {
    ({ pageTable, memory, time, outPage } = await memoryPageDisplacement(
      pageTable,
      memory,
      memoryVolume,
      page,
      time,
      memoryTime,
      interruptTime,
      MemoryGetOutPage
    ));
  }
  // 修改页表
  if (outPage !== -1) {
    pageTable[outPage].status = 0;
  }
  pageTable[page].status = 1;
  pageTable[page].visit += 1;
  // 访问实际物理地址
  await timeout(memoryTime);
  return {
    pageTable,
    TLB,
    memory,
    time
  };
}

onmessage = async function({
  data: {
    pageTable,
    TLB,
    memory,
    memoryVolume,
    pageAmount,
    TLBAmount,
    pageList,
    time,
    interruptTime,
    memoryTime,
    TLBTime,
    hasTLB
  }
}) {
  // 进行运算
  for (const page of pageList) {
    await LFU({
      pageTable,
      TLB,
      memory,
      memoryVolume,
      pageAmount,
      TLBAmount,
      page,
      time,
      interruptTime,
      memoryTime,
      TLBTime,
      hasTLB
    })
      .then(workerResult => {
        ({ pageTable, TLB, memory, time } = workerResult);
        workerResult.page = page;
        postMessage({
          success: true,
          workerResult
        });
      })
      .catch(err => {
        postMessage({
          success: false,
          message: err.message
        });
      });
  }
};
