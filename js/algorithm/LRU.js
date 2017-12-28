/**
 * LRU
 */

/**
 * 获取需要换出的页
 *
 * @param {any} pageTable 页表
 * @returns
 */
function MemoryGetOutPage(pageTable) {
  let outPage = 0;
  // 寻找距离上次访问时间最久的页面
  pageTable.forEach(({ visit, status }, index) => {
    if (status === 1 && visit > pageTable[outPage].visit) {
      outPage = index;
    }
  });
  return outPage;
}

function TLBGetOutPage(TLB) {
  let outPage = 0;
  // 寻找距离上次访问时间最久的页面
  TLB.forEach(({ visit }, index) => {
    if (visit > TLB[outPage].visit) {
      outPage = index;
    }
  });
  return outPage;
}

/**
 * FIFO置换内存
 *
 * @param {any} pageTable 页表
 * @param {any} memory 内存
 * @param {any} memoryVolume 内存容量
 * @param {any} page 要访问的页
 * @param {any} time 当前时间
 * @param {any} interruptTime 缺页中断时间
 * @returns
 */
async function FIFO({
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
}) {
  let outPage = -1;
  // 判断缺页
  if (page > pageAmount) {
    throw new Error('越界中断');
  }
  if (hasTLB) {
    // 检索快表
    await timeout(TLBTime);
    if (TLB.indexOf(page) === -1) {
      // 不在快表中
      ({
        pageTable, memory, time, outPage,
      } = await memoryPageDisplacement(
        pageTable,
        memory,
        memoryVolume,
        page,
        time,
        memoryTime,
        interruptTime,
        MemoryGetOutPage,
      ));
      // 修改快表
      ({ TLB, time } = await TLBPageDisplacement(
        TLB,
        TLBAmount,
        page,
        time,
        TLBTime,
        TLBGetOutPage,
        outPage,
      ));
      TLB[TLB.indexOf(page)].visit += 1;
    }
  } else {
    ({
      pageTable, memory, time, outPage,
    } = await memoryPageDisplacement(
      pageTable,
      memory,
      memoryVolume,
      page,
      time,
      memoryTime,
      interruptTime,
      MemoryGetOutPage,
    ));
  }
  // 修改页表
  if (outPage !== -1) {
    pageTable[outPage].status = 0;
    pageTable[outPage].visit = 0;
  }
  pageTable[page].status = 1;
  pageTable[page].visit = 0;
  pageTable.forEach(({ status }, index) => {
    if (status === 1) {
      pageTable[index].visit += 1;
    }
  });
  // 访问实际物理地址
  await timeout(memoryTime);
  return {
    pageTable,
    TLB,
    memory,
    time,
  };
}
