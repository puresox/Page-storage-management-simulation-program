/**
 * 请求分页的地址变换
 */

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
) {
  // 访问页表
  await timeout(memoryTime);
  let outPage = -1;
  // 判断页是否在内存
  if (pageTable[page].status === 0) {
    // 该页不在内存 缺页中断
    await timeout(interruptTime);
    if (memory.length === memoryVolume) {
      // 内存已满
      /** 找最先进入的页面 */
      outPage = getOutPage(pageTable);
      /** 换出最先进入内存的页面 */
      memory[memory.indexOf(outPage)] = -1;
    }
    // 将该页放入内存
    memory[memory.indexOf(-1)] = page;
    return {
      pageTable,
      memory,
      time: time + memoryTime + interruptTime,
      outPage,
    };
  }
  // 该页在内存
  return {
    pageTable,
    memory,
    time: time + memoryTime,
    outPage,
  };
}

async function TLBPageDisplacement(TLB, TLBAmount, page, time, TLBTime, getOutPage, memoryOutPage) {
  // 去除被换出内存的页
  if (memoryOutPage !== -1 && TLB.indexOf(memoryOutPage) !== -1) {
    TLB[TLB.indexOf(memoryOutPage)] = { page: -1, visit: 0 };
  }
  // 修改快表
  await timeout(TLBTime);
  let outPage = -1;
  if (TLB.length === TLBAmount || TLB.indexOf({ page: -1, visit: 0 }) !== -1) {
    // 快表已满
    /** 找最先进入的页面 */
    outPage = getOutPage(TLB);
    /** 换出最先进入内存的页面 */
    TLB[outPage].page = -1;
    TLB[outPage].visit = 0;
  }
  // 将该页放入内存
  if (outPage === -1) {
    TLB[TLB.indexOf({ page: -1, visit: 0 })].page = page;
  }
  TLB[outPage].page = page;
  return {
    TLB,
    time: time + TLBTime,
  };
}
