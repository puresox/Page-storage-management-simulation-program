/**
 * OPT
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
  getOutPage,
  lostPageTimes
) {
  // 访问页表
  await timeout(memoryTime);
  time += memoryTime;
  let outPage = -1;
  // 判断页是否在内存
  if (pageTable[page].status === 0) {
    // 该页不在内存 缺页中断
    lostPageTimes += 1;
    await timeout(interruptTime);
    time += interruptTime;
    if (memory.indexOf(-1) === -1) {
      // 内存已满
      /** 找最先进入的页面 */
      outPage = getOutPage(memory, pageTable);
      /** 换出最先进入内存的页面 */
      memory[memory.indexOf(outPage)] = -1;
    }
    // 将该页放入内存
    memory[memory.indexOf(-1)] = page;
  }
  // 该页在内存
  return {
    pageTable,
    memory,
    time,
    outPage,
    lostPageTimes
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
  let full = true;
  // 去除被换出内存的页
  for (let index = 0; index < TLB.length; index++) {
    if (TLB[index].page === memoryOutPage) {
      TLB[index] = { page: -1, visit: 0 };
    }
    if (TLB[index].page === -1) {
      full = false;
    }
  }
  // 修改快表
  await timeout(TLBTime);
  time += TLBTime;
  let outPage = -1;
  if (full) {
    // 快表已满
    /** 找最先进入的页面 */
    outPage = getOutPage(TLB);
    /** 换出最先进入内存的页面 */
    TLB[outPage].page = -1;
    TLB[outPage].visit = 0;
  }
  // 将该页放入内存
  for (let index = 0; index < TLB.length; index++) {
    if (TLB[index].page === -1) {
      TLB[index].page = page;
      break;
    }
  }
  return {
    TLB,
    time
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
  // 寻找距离下次访问时间最久的页面
  memory.forEach(element => {
    if (pageTable[element].visit > pageTable[outPage].visit) {
      outPage = element;
    }
  });
  return outPage;
}

function TLBGetOutPage(TLB) {
  let outPage = 0;
  // 寻找距离下次访问时间最久的页面
  TLB.forEach(({ visit }, index) => {
    if (visit > TLB[outPage].visit) {
      outPage = index;
    }
  });
  return outPage;
}

/**
 * OPT置换内存
 *
 * @param {any} pageTable 页表
 * @param {any} memory 内存
 * @param {any} memoryVolume 内存容量
 * @param {any} page 要访问的页
 * @param {any} time 当前时间
 * @param {any} interruptTime 缺页中断时间
 * @returns
 */
async function OPT({
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
  hasTLB,
  pageList,
  lostPageTimes
}) {
  let outPage = -1;
  // 判断越界
  if (page > pageAmount) {
    throw new Error("越界中断");
  }
  if (hasTLB) {
    // 检索快表
    await timeout(TLBTime);
    time += TLBTime;
    let isIn = false;
    for (let index = 0; index < TLB.length; index++) {
      if (TLB[index].page === page) {
        isIn = true;
      }
    }
    if (!isIn) {
      // 不在快表中
      ({
        pageTable,
        memory,
        time,
        outPage,
        lostPageTimes
      } = await memoryPageDisplacement(
        pageTable,
        memory,
        memoryVolume,
        page,
        time,
        memoryTime,
        interruptTime,
        MemoryGetOutPage,
        lostPageTimes
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
      TLB.forEach((TLBItem, index) => {
        if (TLB[index].page === page) {
          TLB[index].visit += 1;
        }
      });
    }
  } else {
    ({
      pageTable,
      memory,
      time,
      outPage,
      lostPageTimes
    } = await memoryPageDisplacement(
      pageTable,
      memory,
      memoryVolume,
      page,
      time,
      memoryTime,
      interruptTime,
      MemoryGetOutPage,
      lostPageTimes
    ));
  }
  // 修改页表
  if (outPage !== -1) {
    pageTable[outPage].status = 0;
  }
  pageTable[page].status = 1;
  pageList.shift();
  pageTable.forEach((pageItem, index) => {
    pageTable[index].visit -= 1;
    if (pageTable[index].visit === 0) {
      pageTable[index].visit =
        pageList.indexOf(index) === -1
          ? pageList.length + 1
          : pageList.indexOf(index) + 1;
    }
  });
  // 访问实际物理地址
  await timeout(memoryTime);
  time += memoryTime;
  return {
    pageTable,
    TLB,
    memory,
    time,
    pageList,
    lostPageTimes
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
    hasTLB,
    lostPageTimes
  }
}) {
  // 进行运算
  pageTable.forEach((pageItem, index) => {
    pageTable[index].visit =
      pageList.indexOf(index) === -1
        ? pageList.length + 1
        : pageList.indexOf(index) + 1;
  });
  const pageListSolid = [...pageList];
  for (const page of pageListSolid) {
    await OPT({
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
      hasTLB,
      pageList,
      lostPageTimes
    })
      .then(workerResult => {
        ({
          pageTable,
          TLB,
          memory,
          time,
          pageList,
          lostPageTimes
        } = workerResult);
        workerResult.page = page;
        postMessage({
          success: true,
          workerResult
        });
      })
      .catch(err => {
        postMessage({
          success: false,
          message: err
        });
      });
  }
};
